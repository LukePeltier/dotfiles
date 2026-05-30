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

const DEFAULT_PR_LIST_FIELDS = [
  "number",
  "title",
  "state",
  "isDraft",
  "author",
  "headRefName",
  "baseRefName",
  "url",
] as const;

const DEFAULT_TIMEOUT_MS = 60_000;
const CREATE_TIMEOUT_MS = 120_000;

type ToolUpdate = (result: {
  content: Array<{ type: "text"; text: string }>;
  details?: Record<string, unknown>;
}) => void;

type GhResult = Awaited<ReturnType<ExtensionAPI["exec"]>>;

const CreatePrParams = Type.Object({
  title: Type.Optional(Type.String({ description: "Pull request title. Required unless fill or web is true." })),
  body: Type.Optional(Type.String({ description: "Pull request body. Defaults to an empty body when title is provided." })),
  base: Type.Optional(Type.String({ description: "Base branch to merge into, e.g. main." })),
  head: Type.Optional(Type.String({ description: "Head branch to merge from, e.g. owner:feature-branch." })),
  draft: Type.Optional(Type.Boolean({ description: "Create the pull request as a draft." })),
  fill: Type.Optional(Type.Boolean({ description: "Use gh's --fill mode to populate title/body from commits." })),
  web: Type.Optional(Type.Boolean({ description: "Open GitHub's web UI to create the pull request." })),
  maintainerEdit: Type.Optional(Type.Boolean({ description: "Allow maintainers to edit the PR branch. Defaults to gh's default; false passes --no-maintainer-edit." })),
  reviewers: Type.Optional(Type.Array(Type.String(), { description: "GitHub users or teams to request as reviewers." })),
  assignees: Type.Optional(Type.Array(Type.String(), { description: "GitHub users to assign." })),
  labels: Type.Optional(Type.Array(Type.String(), { description: "Labels to apply." })),
  projects: Type.Optional(Type.Array(Type.String(), { description: "Projects to add this PR to." })),
  milestone: Type.Optional(Type.String({ description: "Milestone to assign." })),
});

const ViewPrParams = Type.Object({
  selector: Type.Optional(Type.String({ description: "PR number, URL, or branch. Defaults to the PR for the current branch." })),
  comments: Type.Optional(Type.Boolean({ description: "Include comments in human-readable output. Ignored when jsonFields is set." })),
  web: Type.Optional(Type.Boolean({ description: "Open the PR in a browser with gh pr view --web." })),
  jsonFields: Type.Optional(Type.Array(Type.String(), { description: "Fields for gh pr view --json, e.g. number,title,body,url,reviews." })),
});

const ListPrParams = Type.Object({
  state: Type.Optional(StringEnum(["open", "closed", "merged", "all"] as const, { description: "PR state filter. Defaults to open." })),
  limit: Type.Optional(Type.Number({ description: "Maximum PRs to return. Defaults to 30." })),
  search: Type.Optional(Type.String({ description: "GitHub search query passed to gh pr list --search." })),
  author: Type.Optional(Type.String({ description: "Filter by author." })),
  base: Type.Optional(Type.String({ description: "Filter by base branch." })),
  head: Type.Optional(Type.String({ description: "Filter by head branch." })),
  jsonFields: Type.Optional(Type.Array(Type.String(), { description: "Fields for gh pr list --json. Defaults to useful summary fields." })),
});

type CreatePrInput = Static<typeof CreatePrParams>;
type ViewPrInput = Static<typeof ViewPrParams>;
type ListPrInput = Static<typeof ListPrParams>;

function pushRepeated(args: string[], flag: string, values: string[] | undefined): void {
  for (const value of values ?? []) {
    const trimmed = value.trim();
    if (trimmed) {
      args.push(flag, trimmed);
    }
  }
}

function fieldsArg(fields: readonly string[]): string {
  return fields.map((field) => field.trim()).filter(Boolean).join(",");
}

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
    if (arg === "--body") {
      const body = args[index + 1] ?? "";
      displayArgs.push(arg, `<body ${body.length} chars>`);
      index += 1;
      continue;
    }
    displayArgs.push(quoteArgForDisplay(arg));
  }

  return [command, ...displayArgs].join(" ");
}

function buildCreateArgs(params: CreatePrInput): string[] {
  if (!params.web && !params.fill && !params.title?.trim()) {
    throw new Error("github_pr_create requires title, fill=true, or web=true to avoid gh's interactive prompt.");
  }

  const args = ["pr", "create"];

  if (params.title?.trim()) {
    args.push("--title", params.title.trim());
  }

  if (params.body !== undefined) {
    args.push("--body", params.body);
  } else if (params.title?.trim() && !params.fill && !params.web) {
    args.push("--body", "");
  }

  if (params.base?.trim()) args.push("--base", params.base.trim());
  if (params.head?.trim()) args.push("--head", params.head.trim());
  if (params.draft) args.push("--draft");
  if (params.fill) args.push("--fill");
  if (params.web) args.push("--web");
  if (params.maintainerEdit === false) args.push("--no-maintainer-edit");

  pushRepeated(args, "--reviewer", params.reviewers);
  pushRepeated(args, "--assignee", params.assignees);
  pushRepeated(args, "--label", params.labels);
  pushRepeated(args, "--project", params.projects);

  if (params.milestone?.trim()) {
    args.push("--milestone", params.milestone.trim());
  }

  return args;
}

function buildViewArgs(params: ViewPrInput): string[] {
  const args = ["pr", "view"];
  if (params.selector?.trim()) args.push(params.selector.trim());

  if (params.web) {
    args.push("--web");
    return args;
  }

  const jsonFields = params.jsonFields?.map((field) => field.trim()).filter(Boolean);
  if (jsonFields && jsonFields.length > 0) {
    args.push("--json", fieldsArg(jsonFields));
  } else if (params.comments) {
    args.push("--comments");
  }

  return args;
}

function buildListArgs(params: ListPrInput): string[] {
  const args = ["pr", "list"];
  args.push("--state", params.state ?? "open");
  args.push("--limit", String(params.limit ?? 30));

  if (params.search?.trim()) args.push("--search", params.search.trim());
  if (params.author?.trim()) args.push("--author", params.author.trim());
  if (params.base?.trim()) args.push("--base", params.base.trim());
  if (params.head?.trim()) args.push("--head", params.head.trim());

  const jsonFields = params.jsonFields?.map((field) => field.trim()).filter(Boolean);
  args.push("--json", fieldsArg(jsonFields && jsonFields.length > 0 ? jsonFields : DEFAULT_PR_LIST_FIELDS));

  return args;
}

async function runGh(
  pi: ExtensionAPI,
  cwd: string,
  args: string[],
  signal: AbortSignal | undefined,
  onUpdate: ToolUpdate | undefined,
  timeout = DEFAULT_TIMEOUT_MS,
): Promise<GhResult> {
  onUpdate?.({
    content: [{ type: "text", text: `Running ${commandPreview("gh", args)}` }],
    details: { command: ["gh", ...args] },
  });

  const result = await pi.exec("gh", args, { cwd, signal, timeout });
  if (result.code !== 0) {
    const stderr = result.stderr.trim();
    const stdout = result.stdout.trim();
    const details = [stderr, stdout].filter(Boolean).join("\n");
    throw new Error(`gh ${args.join(" ")} failed (${result.code}): ${details || "no output"}`);
  }

  return result;
}

async function formatGhOutput(
  toolName: string,
  args: string[],
  result: GhResult,
): Promise<{
  text: string;
  details: Record<string, unknown>;
}> {
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
    command: ["gh", ...args],
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

async function executeCreatePr(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  params: CreatePrInput,
  signal?: AbortSignal,
  onUpdate?: ToolUpdate,
): Promise<{ content: Array<{ type: "text"; text: string }>; details: Record<string, unknown> }> {
  const args = buildCreateArgs(params);

  if (!ctx.hasUI) {
    throw new Error("github_pr_create requires interactive confirmation. Run pi interactively or use gh pr create manually.");
  }

  const ok = await ctx.ui.confirm(
    "Create GitHub pull request?",
    `${commandPreview("gh", args)}\n\nThis will create or open a pull request via GitHub CLI.`,
  );
  if (!ok) {
    return {
      content: [{ type: "text", text: "Cancelled GitHub pull request creation." }],
      details: { command: ["gh", ...args], cancelled: true },
    };
  }

  const result = await runGh(pi, ctx.cwd, args, signal, onUpdate, CREATE_TIMEOUT_MS);
  const output = await formatGhOutput("gh-pr-create", args, result);
  return {
    content: [{ type: "text", text: output.text }],
    details: output.details,
  };
}

async function sendCommandOutput(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  title: string,
  args: string[],
  result: GhResult,
): Promise<void> {
  const output = await formatGhOutput("gh-pr-command", args, result);
  pi.sendMessage({
    customType: "github-pr",
    content: `${title}\n\n${output.text}`,
    display: true,
    details: output.details,
  });
  ctx.ui.notify(title, "info");
}

export default function githubPullRequestExtension(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "github_pr_create",
    label: "GitHub PR Create",
    description: `Create a GitHub pull request using gh pr create. Requires interactive confirmation. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; truncated full output is saved to a temp file.`,
    promptSnippet: "Create GitHub pull requests through the gh CLI with interactive confirmation",
    promptGuidelines: [
      "Use github_pr_create only when the user explicitly asks to create a pull request.",
      "Before github_pr_create, inspect git status and branch context when the user has not already provided the PR title/body/base/head.",
      "Do not use github_pr_create for dry-run planning; explain the proposed PR instead unless the user asks to create it.",
    ],
    parameters: CreatePrParams,
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      return executeCreatePr(pi, ctx, params, signal, onUpdate);
    },
    renderCall(args, theme) {
      const mode = args.web ? "web" : args.fill ? "fill" : "create";
      const title = args.title ? ` ${JSON.stringify(args.title)}` : "";
      return new Text(`${theme.fg("toolTitle", theme.bold("github_pr_create"))} ${theme.fg("muted", mode)}${title}`, 0, 0);
    },
    renderResult(result, { isPartial }, theme) {
      if (isPartial) return new Text(theme.fg("warning", "Creating PR..."), 0, 0);
      const details = result.details as Record<string, unknown> | undefined;
      const cancelled = details?.cancelled === true;
      return new Text(cancelled ? theme.fg("warning", "PR creation cancelled") : theme.fg("success", "PR create command completed"), 0, 0);
    },
  });

  pi.registerTool({
    name: "github_pr_view",
    label: "GitHub PR View",
    description: `View a GitHub pull request using gh pr view. Defaults to the current branch PR. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; truncated full output is saved to a temp file.`,
    promptSnippet: "View GitHub pull requests through the gh CLI",
    promptGuidelines: [
      "Use github_pr_view when the user asks to inspect a pull request, PR comments, PR metadata, or the PR for the current branch.",
    ],
    parameters: ViewPrParams,
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const args = buildViewArgs(params);
      const result = await runGh(pi, ctx.cwd, args, signal, onUpdate);
      const output = await formatGhOutput("gh-pr-view", args, result);
      return {
        content: [{ type: "text", text: output.text }],
        details: output.details,
      };
    },
    renderCall(args, theme) {
      const selector = args.selector ? ` ${args.selector}` : " current branch";
      return new Text(`${theme.fg("toolTitle", theme.bold("github_pr_view"))}${theme.fg("muted", selector)}`, 0, 0);
    },
    renderResult(_result, { isPartial }, theme) {
      return new Text(isPartial ? theme.fg("warning", "Loading PR...") : theme.fg("success", "PR loaded"), 0, 0);
    },
  });

  pi.registerTool({
    name: "github_pr_list",
    label: "GitHub PR List",
    description: `List GitHub pull requests using gh pr list. Defaults to open PRs and JSON summary output. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; truncated full output is saved to a temp file.`,
    promptSnippet: "List GitHub pull requests through the gh CLI",
    promptGuidelines: [
      "Use github_pr_list to discover pull request numbers or summarize open/closed/merged pull requests.",
    ],
    parameters: ListPrParams,
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const args = buildListArgs(params);
      const result = await runGh(pi, ctx.cwd, args, signal, onUpdate);
      const output = await formatGhOutput("gh-pr-list", args, result);
      return {
        content: [{ type: "text", text: output.text }],
        details: output.details,
      };
    },
    renderCall(args, theme) {
      return new Text(`${theme.fg("toolTitle", theme.bold("github_pr_list"))} ${theme.fg("muted", args.state ?? "open")}`, 0, 0);
    },
    renderResult(_result, { isPartial }, theme) {
      return new Text(isPartial ? theme.fg("warning", "Loading PRs...") : theme.fg("success", "PR list loaded"), 0, 0);
    },
  });

  pi.registerCommand("gh-pr-view", {
    description: "View a GitHub pull request: /gh-pr-view [number|url|branch]",
    handler: async (args, ctx) => {
      const viewArgs = buildViewArgs({ selector: args.trim() || undefined, comments: true });
      const result = await runGh(pi, ctx.cwd, viewArgs, undefined, undefined);
      await sendCommandOutput(pi, ctx, "GitHub PR", viewArgs, result);
    },
  });

  pi.registerCommand("gh-pr-list", {
    description: "List open GitHub pull requests",
    handler: async (_args, ctx) => {
      const listArgs = buildListArgs({});
      const result = await runGh(pi, ctx.cwd, listArgs, undefined, undefined);
      await sendCommandOutput(pi, ctx, "GitHub pull requests", listArgs, result);
    },
  });

  pi.registerCommand("gh-pr-create", {
    description: "Interactively create a GitHub pull request with gh pr create",
    handler: async (args, ctx) => {
      if (!ctx.hasUI) {
        throw new Error("/gh-pr-create requires interactive UI.");
      }

      const useFill = args.trim() === "--fill";
      const title = useFill ? undefined : args.trim() || (await ctx.ui.input("Pull request title", "Title"));
      if (!useFill && !title?.trim()) {
        ctx.ui.notify("Cancelled PR creation: no title provided", "warning");
        return;
      }

      const body = useFill ? undefined : await ctx.ui.editor("Pull request body", "");
      const base = await ctx.ui.input("Base branch (blank for gh default)", "");
      const draft = await ctx.ui.confirm("Draft pull request?", "Create this PR as a draft?");

      const response = await executeCreatePr(pi, ctx, {
        title: title?.trim(),
        body: useFill ? undefined : body ?? "",
        base: base?.trim() || undefined,
        draft,
        fill: useFill,
      });

      pi.sendMessage({
        customType: "github-pr",
        content: `GitHub PR create\n\n${response.content[0]?.text ?? ""}`,
        display: true,
        details: response.details,
      });
    },
  });
}
