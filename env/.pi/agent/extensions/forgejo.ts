import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  truncateHead,
  withFileMutationQueue,
} from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Text } from "@earendil-works/pi-tui";
import { Type, type Static } from "typebox";

/**
 * Forgejo (forgejo-cli / `fj`) extension.
 *
 * Mirrors the github-pr.ts extension but adds issues, since Forgejo is used for
 * issue tracking. The repo is auto-detected from the current git remote (SSH or
 * HTTPS pointing at the Forgejo instance), matching how `fj` works day-to-day.
 *
 * All commands run with `--style minimal` so piped output has no ANSI codes.
 */

const DEFAULT_TIMEOUT_MS = 60_000;
const CREATE_TIMEOUT_MS = 120_000;

const GLOBAL_ARGS = ["--style", "minimal"];

type ToolUpdate = (result: {
  content: Array<{ type: "text"; text: string }>;
  details?: Record<string, unknown>;
}) => void;

type FjResult = Awaited<ReturnType<ExtensionAPI["exec"]>>;

// ---------------------------------------------------------------------------
// Parameter schemas
// ---------------------------------------------------------------------------

const CreatePrParams = Type.Object({
  title: Type.Optional(Type.String({ description: "Pull request title. Required unless web or autofill is true." })),
  body: Type.Optional(Type.String({ description: "Pull request body. Defaults to an empty body." })),
  base: Type.Optional(Type.String({ description: "Branch to merge onto." })),
  head: Type.Optional(Type.String({ description: "Branch to pull changes from." })),
  draft: Type.Optional(Type.Boolean({ description: "Create as a draft (fj marks drafts with a 'WIP: ' title prefix)." })),
  autofill: Type.Optional(Type.Boolean({ description: "Populate title/body from the branch's commits (fj --autofill)." })),
  web: Type.Optional(Type.Boolean({ description: "Open the PR creation page in your browser instead of creating." })),
  assignees: Type.Optional(Type.Array(Type.String(), { description: "Usernames to assign after creation." })),
  labels: Type.Optional(Type.Array(Type.String(), { description: "Labels to apply after creation." })),
});

const ViewPrParams = Type.Object({
  id: Type.Optional(Type.Number({ description: "Pull request number. Required unless web." })),
  comments: Type.Optional(Type.Boolean({ description: "Include comments." })),
  web: Type.Optional(Type.Boolean({ description: "Open the PR in your browser." })),
});

const ListParams = Type.Object({
  state: Type.Optional(StringEnum(["open", "closed", "all"] as const, { description: "State filter. Defaults to open." })),
  labels: Type.Optional(Type.Array(Type.String(), { description: "Filter by labels (any match)." })),
  creator: Type.Optional(Type.String({ description: "Filter by creator username." })),
  assignee: Type.Optional(Type.String({ description: "Filter by assignee username." })),
  query: Type.Optional(Type.String({ description: "Free-text search query." })),
});

const CloseParams = Type.Object({
  id: Type.Number({ description: "PR or issue number." }),
  comment: Type.Optional(Type.String({ description: "Comment to add before closing." })),
});

const CommentParams = Type.Object({
  id: Type.Number({ description: "PR or issue number." }),
  body: Type.String({ description: "Comment body." }),
});

const CreateIssueParams = Type.Object({
  title: Type.Optional(Type.String({ description: "Issue title. Required unless web is true." })),
  body: Type.Optional(Type.String({ description: "Issue body. Defaults to an empty body." })),
  web: Type.Optional(Type.Boolean({ description: "Open the issue creation page in your browser instead of creating." })),
  assignees: Type.Optional(Type.Array(Type.String(), { description: "Usernames to assign after creation." })),
  labels: Type.Optional(Type.Array(Type.String(), { description: "Labels to apply after creation." })),
});

const ViewIssueParams = Type.Object({
  id: Type.Optional(Type.Number({ description: "Issue number. Required unless web." })),
  comments: Type.Optional(Type.Boolean({ description: "Include comments." })),
  web: Type.Optional(Type.Boolean({ description: "Open the issue in your browser." })),
});

type CreatePrInput = Static<typeof CreatePrParams>;
type CreateIssueInput = Static<typeof CreateIssueParams>;
type ViewInput = Static<typeof ViewPrParams>;
type ListInput = Static<typeof ListParams>;
type CloseInput = Static<typeof CloseParams>;
type CommentInput = Static<typeof CommentParams>;

// ---------------------------------------------------------------------------
// CLI helpers
// ---------------------------------------------------------------------------

function quoteArgForDisplay(arg: string): string {
  if (/^[A-Za-z0-9_./:=@+-]+$/.test(arg)) {
    return arg;
  }
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

function commandPreview(command: string, args: string[]): string {
  const displayArgs: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--body" || arg === "-w") {
      const body = args[index + 1] ?? "";
      displayArgs.push(arg, `<${body.length} chars>`);
      index += 1;
      continue;
    }
    displayArgs.push(quoteArgForDisplay(arg));
  }
  return [command, ...displayArgs].join(" ");
}

function pushRepeated(args: string[], flag: string, values: string[] | undefined): void {
  for (const value of values ?? []) {
    const trimmed = value.trim();
    if (trimmed) args.push(flag, trimmed);
  }
}

async function runFj(
  pi: ExtensionAPI,
  cwd: string,
  args: string[],
  signal: AbortSignal | undefined,
  onUpdate: ToolUpdate | undefined,
  timeout = DEFAULT_TIMEOUT_MS,
): Promise<FjResult> {
  const fullArgs = [...GLOBAL_ARGS, ...args];
  onUpdate?.({
    content: [{ type: "text", text: `Running ${commandPreview("fj", fullArgs)}` }],
    details: { command: ["fj", ...fullArgs] },
  });

  const result = await pi.exec("fj", fullArgs, { cwd, signal, timeout });
  if (result.code !== 0) {
    const stderr = result.stderr.trim();
    const stdout = result.stdout.trim();
    const details = [stderr, stdout].filter(Boolean).join("\n");
    throw new Error(`fj ${args.join(" ")} failed (${result.code}): ${details || "no output"}`);
  }
  return result;
}

async function formatFjOutput(
  toolName: string,
  args: string[],
  result: FjResult,
): Promise<{ text: string; details: Record<string, unknown> }> {
  const stderr = result.stderr.trim();
  const output = [result.stdout.trim(), stderr ? `[stderr]\n${stderr}` : ""]
    .filter(Boolean)
    .join("\n\n");
  const rawText = output || "Command completed with no output.";
  const truncation = truncateHead(rawText, {
    maxLines: DEFAULT_MAX_LINES,
    maxBytes: DEFAULT_MAX_BYTES,
  });

  const details: Record<string, unknown> = {
    command: ["fj", ...GLOBAL_ARGS, ...args],
    code: result.code,
  };

  if (!truncation.truncated) {
    return { text: truncation.content, details };
  }

  const tempDir = await mkdtemp(join(tmpdir(), `pi-${toolName}-`));
  const fullOutputPath = join(tempDir, "output.txt");
  await withFileMutationQueue(fullOutputPath, async () => {
    await writeFile(fullOutputPath, rawText, "utf8");
  });

  details.truncation = truncation;
  details.fullOutputPath = fullOutputPath;

  const text = `${truncation.content}\n\n[Output truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). Full output saved to: ${fullOutputPath}]`;
  return { text, details };
}

/** Parse `created pull request #42` / `created issue #7` style output. */
function parseCreatedNumber(stdout: string): number | undefined {
  const match = stdout.match(/#\s*(\d+)/);
  return match ? Number(match[1]) : undefined;
}

interface ToolOutput {
  content: Array<{ type: "text"; text: string }>;
  details: Record<string, unknown>;
}

async function textOutput(
  toolName: string,
  args: string[],
  result: FjResult,
  extraText = "",
  extraDetails: Record<string, unknown> = {},
): Promise<ToolOutput> {
  const output = await formatFjOutput(toolName, args, result);
  const text = extraText ? `${output.text}\n\n${extraText}` : output.text;
  return {
    content: [{ type: "text", text }],
    details: { ...output.details, ...extraDetails },
  };
}

// ---------------------------------------------------------------------------
// Argument builders
// ---------------------------------------------------------------------------

function buildPrCreateArgs(params: CreatePrInput): string[] {
  if (!params.web && !params.autofill && !params.title?.trim()) {
    throw new Error("forgejo_pr_create requires title, autofill=true, or web=true.");
  }
  const args = ["pr", "create"];
  if (params.title?.trim()) {
    args.push(params.draft ? `WIP: ${params.title.trim()}` : params.title.trim());
  }
  if (params.web) {
    args.push("--web");
    return args;
  }
  if (params.base?.trim()) args.push("--base", params.base.trim());
  if (params.head?.trim()) args.push("--head", params.head.trim());
  if (params.autofill) args.push("--autofill");
  // Always pass a body when not opening the browser/editor to avoid fj launching $EDITOR.
  if (!params.autofill) args.push("--body", params.body ?? "");
  return args;
}

function buildIssueCreateArgs(params: CreateIssueInput): string[] {
  if (!params.web && !params.title?.trim()) {
    throw new Error("forgejo_issue_create requires title or web=true.");
  }
  const args = ["issue", "create"];
  if (params.title?.trim()) args.push(params.title.trim());
  if (params.web) {
    args.push("--web");
    return args;
  }
  args.push("--body", params.body ?? "");
  return args;
}

function buildPrViewArgs(params: ViewInput): { args: string[]; commentArgs?: string[]; browse: boolean } {
  if (params.web) {
    if (params.id === undefined) throw new Error("forgejo_pr_view requires id when web=true.");
    return { args: ["pr", "browse", String(params.id)], browse: true };
  }
  if (params.id === undefined) throw new Error("forgejo_pr_view requires id (or web=true).");
  return {
    args: ["pr", "view", String(params.id)],
    // comments is a separate subcommand that only prints comments — always fetch
    // the body first, then append comments so neither half is lost.
    commentArgs: params.comments ? ["pr", "view", String(params.id), "comments"] : undefined,
    browse: false,
  };
}

function buildIssueViewArgs(params: ViewInput): { args: string[]; commentArgs?: string[]; browse: boolean } {
  if (params.web) {
    if (params.id === undefined) throw new Error("forgejo_issue_view requires id when web=true.");
    return { args: ["issue", "browse", String(params.id)], browse: true };
  }
  if (params.id === undefined) throw new Error("forgejo_issue_view requires id (or web=true).");
  return {
    args: ["issue", "view", String(params.id)],
    // comments is a separate subcommand that only prints comments — always fetch
    // the body first, then append comments so neither half is lost.
    commentArgs: params.comments ? ["issue", "view", String(params.id), "comments"] : undefined,
    browse: false,
  };
}

function buildSearchArgs(kind: "pr" | "issue", params: ListInput): string[] {
  const args = [kind, "search"];
  args.push("-s", params.state ?? "open");
  if (params.labels && params.labels.length > 0) {
    args.push("-l", params.labels.map((l) => l.trim()).filter(Boolean).join(","));
  }
  if (params.creator?.trim()) args.push("-c", params.creator.trim());
  if (params.assignee?.trim()) args.push("-a", params.assignee.trim());
  if (params.query?.trim()) args.push(params.query.trim());
  return args;
}

function buildCloseArgs(kind: "pr" | "issue", params: CloseInput): string[] {
  const args = [kind, "close", String(params.id)];
  if (params.comment !== undefined) args.push("-w", params.comment);
  return args;
}

function buildCommentArgs(kind: "pr" | "issue", params: CommentInput): string[] {
  return [kind, "comment", String(params.id), params.body];
}

// ---------------------------------------------------------------------------
// Post-create follow-ups (assign + label), best-effort
// ---------------------------------------------------------------------------

async function applyFollowUps(
  pi: ExtensionAPI,
  cwd: string,
  kind: "pr" | "issue",
  id: number,
  assignees: string[] | undefined,
  labels: string[] | undefined,
  signal: AbortSignal | undefined,
): Promise<string> {
  const notes: string[] = [];
  const cleanedAssignees = (assignees ?? []).map((a) => a.trim()).filter(Boolean);
  const cleanedLabels = (labels ?? []).map((l) => l.trim()).filter(Boolean);

  if (cleanedAssignees.length > 0) {
    try {
      // PR assign uses -p <id>; issue assign is positional <id> <users...>.
      const args =
        kind === "pr"
          ? ["pr", "assign", ...cleanedAssignees, "-p", String(id)]
          : ["issue", "assign", String(id), ...cleanedAssignees];
      await runFj(pi, cwd, args, signal, undefined);
      notes.push(`Assigned ${cleanedAssignees.join(", ")}.`);
    } catch (error) {
      notes.push(`Warning: failed to assign ${cleanedAssignees.join(", ")}: ${(error as Error).message}`);
    }
  }

  if (cleanedLabels.length > 0) {
    try {
      const labelArgs = [kind, "edit", String(id), "labels"];
      for (const label of cleanedLabels) labelArgs.push("-a", label);
      await runFj(pi, cwd, labelArgs, signal, undefined);
      notes.push(`Applied labels: ${cleanedLabels.join(", ")}.`);
    } catch (error) {
      notes.push(`Warning: failed to apply labels ${cleanedLabels.join(", ")}: ${(error as Error).message}`);
    }
  }

  return notes.join("\n");
}

async function sendCommandOutput(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  title: string,
  args: string[],
  result: FjResult,
): Promise<void> {
  const output = await formatFjOutput("fj-command", args, result);
  pi.sendMessage({
    customType: "forgejo",
    content: `${title}\n\n${output.text}`,
    display: true,
    details: output.details,
  });
  ctx.ui.notify(title, "info");
}

// ---------------------------------------------------------------------------
// Confirmation gate
// ---------------------------------------------------------------------------

async function confirmAction(
  ctx: ExtensionContext,
  title: string,
  args: string[],
): Promise<boolean> {
  if (!ctx.hasUI) {
    throw new Error(`${title} requires interactive confirmation. Run pi interactively or use fj directly.`);
  }
  return ctx.ui.confirm(
    title,
    `${commandPreview("fj", [...GLOBAL_ARGS, ...args])}\n\nThis runs the forgejo CLI.`,
  );
}

// ---------------------------------------------------------------------------
// Extension entry
// ---------------------------------------------------------------------------

export default function forgejoExtension(pi: ExtensionAPI): void {
  // ----- PR create -----
  pi.registerTool({
    name: "forgejo_pr_create",
    label: "Forgejo PR Create",
    description: `Create a Forgejo pull request using \`fj pr create\`. The repo is auto-detected from the current git remote. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; truncated full output is saved to a temp file.`,
    promptSnippet: "Create Forgejo pull requests through the fj CLI",
    promptGuidelines: [
      "Use forgejo_pr_create only when the user explicitly asks to create a pull request.",
      "Before forgejo_pr_create, inspect git status and branch context when the user has not already provided title/body/base/head.",
      "Do not use forgejo_pr_create for dry-run planning; explain the proposed PR instead unless the user asks to create it.",
    ],
    parameters: CreatePrParams,
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const args = buildPrCreateArgs(params);
      // Creating is non-destructive (easily closed/reverted); no confirmation gate.
      const result = await runFj(pi, ctx.cwd, args, signal, onUpdate, CREATE_TIMEOUT_MS);
      const id = params.web ? undefined : parseCreatedNumber(result.stdout);
      const followUp =
        id !== undefined ? await applyFollowUps(pi, ctx.cwd, "pr", id, params.assignees, params.labels, signal) : "";
      return textOutput("fj-pr-create", args, result, followUp, { createdId: id });
    },
    renderCall(args, theme) {
      const mode = args.web ? "web" : args.autofill ? "autofill" : "create";
      const title = args.title ? ` ${JSON.stringify(args.title)}` : "";
      return new Text(`${theme.fg("toolTitle", theme.bold("forgejo_pr_create"))} ${theme.fg("muted", mode)}${title}`, 0, 0);
    },
    renderResult(result, { isPartial }, theme) {
      if (isPartial) return new Text(theme.fg("warning", "Creating PR..."), 0, 0);
      const cancelled = (result.details as Record<string, unknown> | undefined)?.cancelled === true;
      return new Text(cancelled ? theme.fg("warning", "PR creation cancelled") : theme.fg("success", "PR created"), 0, 0);
    },
  });

  // ----- PR view -----
  pi.registerTool({
    name: "forgejo_pr_view",
    label: "Forgejo PR View",
    description: `View a Forgejo pull request using \`fj pr view\` (or \`fj pr browse\` with web=true). The repo is auto-detected from the current git remote. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}.`,
    promptSnippet: "View Forgejo pull requests through the fj CLI",
    promptGuidelines: ["Use forgejo_pr_view when the user asks to inspect a pull request, its comments, or diff."],
    parameters: ViewPrParams,
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const { args, commentArgs } = buildPrViewArgs(params);
      const result = await runFj(pi, ctx.cwd, args, signal, onUpdate);
      if (commentArgs) {
        const commentResult = await runFj(pi, ctx.cwd, commentArgs, signal, undefined);
        const combined = { ...result, stdout: `${result.stdout.trim()}\n\n${commentResult.stdout.trim()}`.trim() };
        return textOutput("fj-pr-view", args, combined);
      }
      return textOutput("fj-pr-view", args, result);
    },
    renderCall(args, theme) {
      const which = args.web ? "browse" : args.comments ? "comments" : "view";
      const id = args.id ? ` #${args.id}` : "";
      return new Text(`${theme.fg("toolTitle", theme.bold("forgejo_pr_view"))}${theme.fg("muted", ` ${which}${id}`)}`, 0, 0);
    },
    renderResult(_result, { isPartial }, theme) {
      return new Text(isPartial ? theme.fg("warning", "Loading PR...") : theme.fg("success", "PR loaded"), 0, 0);
    },
  });

  // ----- PR list -----
  pi.registerTool({
    name: "forgejo_pr_list",
    label: "Forgejo PR List",
    description: `List/search Forgejo pull requests using \`fj pr search\`. Defaults to open PRs. The repo is auto-detected from the current git remote. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}.`,
    promptSnippet: "List Forgejo pull requests through the fj CLI",
    promptGuidelines: ["Use forgejo_pr_list to discover pull request numbers or summarize open/closed pull requests."],
    parameters: ListParams,
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const args = buildSearchArgs("pr", params);
      const result = await runFj(pi, ctx.cwd, args, signal, onUpdate);
      return textOutput("fj-pr-list", args, result);
    },
    renderCall(args, theme) {
      return new Text(`${theme.fg("toolTitle", theme.bold("forgejo_pr_list"))} ${theme.fg("muted", args.state ?? "open")}`, 0, 0);
    },
    renderResult(_result, { isPartial }, theme) {
      return new Text(isPartial ? theme.fg("warning", "Loading PRs...") : theme.fg("success", "PR list loaded"), 0, 0);
    },
  });

  // ----- PR comment -----
  pi.registerTool({
    name: "forgejo_pr_comment",
    label: "Forgejo PR Comment",
    description: "Add a comment on a Forgejo pull request using `fj pr comment`.",
    promptSnippet: "Comment on Forgejo pull requests through the fj CLI",
    promptGuidelines: ["Use forgejo_pr_comment to add a review note or reply on a pull request."],
    parameters: CommentParams,
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const args = buildCommentArgs("pr", params);
      const result = await runFj(pi, ctx.cwd, args, signal, onUpdate);
      return textOutput("fj-pr-comment", args, result);
    },
    renderCall(args, theme) {
      return new Text(`${theme.fg("toolTitle", theme.bold("forgejo_pr_comment"))}${theme.fg("muted", ` #${args.id}`)}`, 0, 0);
    },
    renderResult(_result, { isPartial }, theme) {
      return new Text(isPartial ? theme.fg("warning", "Commenting...") : theme.fg("success", "Comment added"), 0, 0);
    },
  });

  // ----- PR close -----
  pi.registerTool({
    name: "forgejo_pr_close",
    label: "Forgejo PR Close",
    description: "Close (without merging) a Forgejo pull request using `fj pr close`. Requires interactive confirmation.",
    promptSnippet: "Close Forgejo pull requests through the fj CLI with confirmation",
    promptGuidelines: ["Use forgejo_pr_close only when the user explicitly asks to close a pull request."],
    parameters: CloseParams,
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const args = buildCloseArgs("pr", params);
      const ok = await confirmAction(ctx, "Close Forgejo pull request?", args);
      if (!ok) {
        return {
          content: [{ type: "text", text: "Cancelled PR close." }],
          details: { command: ["fj", ...GLOBAL_ARGS, ...args], cancelled: true },
        };
      }
      const result = await runFj(pi, ctx.cwd, args, signal, onUpdate);
      return textOutput("fj-pr-close", args, result);
    },
    renderCall(args, theme) {
      return new Text(`${theme.fg("toolTitle", theme.bold("forgejo_pr_close"))}${theme.fg("muted", ` #${args.id}`)}`, 0, 0);
    },
    renderResult(result, { isPartial }, theme) {
      if (isPartial) return new Text(theme.fg("warning", "Closing PR..."), 0, 0);
      const cancelled = (result.details as Record<string, unknown> | undefined)?.cancelled === true;
      return new Text(cancelled ? theme.fg("warning", "PR close cancelled") : theme.fg("success", "PR closed"), 0, 0);
    },
  });

  // ----- Issue create -----
  pi.registerTool({
    name: "forgejo_issue_create",
    label: "Forgejo Issue Create",
    description: `Create a Forgejo issue using \`fj issue create\`. The repo is auto-detected from the current git remote. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}.`,
    promptSnippet: "Create Forgejo issues through the fj CLI",
    promptGuidelines: [
      "Use forgejo_issue_create when the user asks to create an issue or add a backlog item / user story.",
      "Include labels (e.g. bug, enhancement, priority) and a clear title and body so the issue is actionable.",
    ],
    parameters: CreateIssueParams,
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const args = buildIssueCreateArgs(params);
      // Creating is non-destructive (easily closed/reverted); no confirmation gate.
      const result = await runFj(pi, ctx.cwd, args, signal, onUpdate, CREATE_TIMEOUT_MS);
      const id = params.web ? undefined : parseCreatedNumber(result.stdout);
      const followUp =
        id !== undefined ? await applyFollowUps(pi, ctx.cwd, "issue", id, params.assignees, params.labels, signal) : "";
      return textOutput("fj-issue-create", args, result, followUp, { createdId: id });
    },
    renderCall(args, theme) {
      const mode = args.web ? "web" : "create";
      const title = args.title ? ` ${JSON.stringify(args.title)}` : "";
      return new Text(`${theme.fg("toolTitle", theme.bold("forgejo_issue_create"))} ${theme.fg("muted", mode)}${title}`, 0, 0);
    },
    renderResult(result, { isPartial }, theme) {
      if (isPartial) return new Text(theme.fg("warning", "Creating issue..."), 0, 0);
      const cancelled = (result.details as Record<string, unknown> | undefined)?.cancelled === true;
      return new Text(cancelled ? theme.fg("warning", "Issue creation cancelled") : theme.fg("success", "Issue created"), 0, 0);
    },
  });

  // ----- Issue view -----
  pi.registerTool({
    name: "forgejo_issue_view",
    label: "Forgejo Issue View",
    description: `View a Forgejo issue using \`fj issue view\` (or \`fj issue browse\` with web=true). The repo is auto-detected from the current git remote. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}.`,
    promptSnippet: "View Forgejo issues through the fj CLI",
    promptGuidelines: ["Use forgejo_issue_view when the user asks to inspect an issue or its comments."],
    parameters: ViewIssueParams,
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const { args, commentArgs } = buildIssueViewArgs(params);
      const result = await runFj(pi, ctx.cwd, args, signal, onUpdate);
      if (commentArgs) {
        const commentResult = await runFj(pi, ctx.cwd, commentArgs, signal, undefined);
        const combined = { ...result, stdout: `${result.stdout.trim()}\n\n${commentResult.stdout.trim()}`.trim() };
        return textOutput("fj-issue-view", args, combined);
      }
      return textOutput("fj-issue-view", args, result);
    },
    renderCall(args, theme) {
      const which = args.web ? "browse" : args.comments ? "comments" : "view";
      const id = args.id ? ` #${args.id}` : "";
      return new Text(`${theme.fg("toolTitle", theme.bold("forgejo_issue_view"))}${theme.fg("muted", ` ${which}${id}`)}`, 0, 0);
    },
    renderResult(_result, { isPartial }, theme) {
      return new Text(isPartial ? theme.fg("warning", "Loading issue...") : theme.fg("success", "Issue loaded"), 0, 0);
    },
  });

  // ----- Issue list -----
  pi.registerTool({
    name: "forgejo_issue_list",
    label: "Forgejo Issue List",
    description: `List/search Forgejo issues using \`fj issue search\`. Defaults to open issues. The repo is auto-detected from the current git remote. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}.`,
    promptSnippet: "List Forgejo issues through the fj CLI",
    promptGuidelines: ["Use forgejo_issue_list to discover issue numbers or summarize the backlog."],
    parameters: ListParams,
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const args = buildSearchArgs("issue", params);
      const result = await runFj(pi, ctx.cwd, args, signal, onUpdate);
      return textOutput("fj-issue-list", args, result);
    },
    renderCall(args, theme) {
      return new Text(`${theme.fg("toolTitle", theme.bold("forgejo_issue_list"))} ${theme.fg("muted", args.state ?? "open")}`, 0, 0);
    },
    renderResult(_result, { isPartial }, theme) {
      return new Text(isPartial ? theme.fg("warning", "Loading issues...") : theme.fg("success", "Issue list loaded"), 0, 0);
    },
  });

  // ----- Issue comment -----
  pi.registerTool({
    name: "forgejo_issue_comment",
    label: "Forgejo Issue Comment",
    description: "Add a comment on a Forgejo issue using `fj issue comment`.",
    promptSnippet: "Comment on Forgejo issues through the fj CLI",
    promptGuidelines: ["Use forgejo_issue_comment to add a progress update or note to an issue."],
    parameters: CommentParams,
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const args = buildCommentArgs("issue", params);
      const result = await runFj(pi, ctx.cwd, args, signal, onUpdate);
      return textOutput("fj-issue-comment", args, result);
    },
    renderCall(args, theme) {
      return new Text(`${theme.fg("toolTitle", theme.bold("forgejo_issue_comment"))}${theme.fg("muted", ` #${args.id}`)}`, 0, 0);
    },
    renderResult(_result, { isPartial }, theme) {
      return new Text(isPartial ? theme.fg("warning", "Commenting...") : theme.fg("success", "Comment added"), 0, 0);
    },
  });

  // ----- Issue close -----
  pi.registerTool({
    name: "forgejo_issue_close",
    label: "Forgejo Issue Close",
    description: "Close a Forgejo issue using `fj issue close`. Requires interactive confirmation.",
    promptSnippet: "Close Forgejo issues through the fj CLI with confirmation",
    promptGuidelines: [
      "Use forgejo_issue_close when work on an issue is complete or the user asks to close it.",
      "Consider leaving a closing comment summarizing what was done.",
    ],
    parameters: CloseParams,
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const args = buildCloseArgs("issue", params);
      const ok = await confirmAction(ctx, "Close Forgejo issue?", args);
      if (!ok) {
        return {
          content: [{ type: "text", text: "Cancelled issue close." }],
          details: { command: ["fj", ...GLOBAL_ARGS, ...args], cancelled: true },
        };
      }
      const result = await runFj(pi, ctx.cwd, args, signal, onUpdate);
      return textOutput("fj-issue-close", args, result);
    },
    renderCall(args, theme) {
      return new Text(`${theme.fg("toolTitle", theme.bold("forgejo_issue_close"))}${theme.fg("muted", ` #${args.id}`)}`, 0, 0);
    },
    renderResult(result, { isPartial }, theme) {
      if (isPartial) return new Text(theme.fg("warning", "Closing issue..."), 0, 0);
      const cancelled = (result.details as Record<string, unknown> | undefined)?.cancelled === true;
      return new Text(cancelled ? theme.fg("warning", "Issue close cancelled") : theme.fg("success", "Issue closed"), 0, 0);
    },
  });

  // ----- Slash commands -----
  pi.registerCommand("fj-prs", {
    description: "List open Forgejo pull requests in this repo",
    handler: async (_args, ctx) => {
      const args = buildSearchArgs("pr", { state: "open" });
      const result = await runFj(pi, ctx.cwd, args, undefined, undefined);
      await sendCommandOutput(pi, ctx, "Forgejo pull requests", args, result);
    },
  });

  pi.registerCommand("fj-issues", {
    description: "List open Forgejo issues in this repo",
    handler: async (_args, ctx) => {
      const args = buildSearchArgs("issue", { state: "open" });
      const result = await runFj(pi, ctx.cwd, args, undefined, undefined);
      await sendCommandOutput(pi, ctx, "Forgejo issues", args, result);
    },
  });

  pi.registerCommand("fj-login", {
    description: "Show current Forgejo auth status (fj auth list && fj whoami)",
    handler: async (_args, ctx) => {
      const list = await runFj(pi, ctx.cwd, ["auth", "list"], undefined, undefined);
      const who = await runFj(pi, ctx.cwd, ["whoami"], undefined, undefined);
      const text = `Auth:\n${list.stdout.trim()}\n\nIdentity:\n${who.stdout.trim()}`;
      pi.sendMessage({
        customType: "forgejo",
        content: `Forgejo auth status\n\n${text}`,
        display: true,
        details: {},
      });
      ctx.ui.notify("Forgejo auth status", "info");
    },
  });
}
