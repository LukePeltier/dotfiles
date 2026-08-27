import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const STATE_ENTRY_TYPE = "manual-mode-state";
const STATUS_ID = "manual-mode";
const MAX_PREVIEW_LENGTH = 6_000;

/** Tools that only inspect state and can run without approval. */
export const AUTO_ALLOWED_TOOLS = new Set(["read", "grep", "find", "ls", "ask_user_question"]);

interface ManualModeState {
	enabled: boolean;
}

export function requiresApproval(toolName: string): boolean {
	return !AUTO_ALLOWED_TOOLS.has(toolName);
}

function stringifyInput(input: unknown): string {
	try {
		const serialized = JSON.stringify(input, null, 2);
		return serialized ?? String(input);
	} catch {
		return String(input);
	}
}

export function formatToolPreview(toolName: string, input: unknown): string {
	let preview: string;

	if (toolName === "bash" && input && typeof input === "object" && "command" in input) {
		preview = String((input as { command: unknown }).command);
	} else {
		preview = stringifyInput(input);
	}

	if (preview.length <= MAX_PREVIEW_LENGTH) return preview;

	const omitted = preview.length - MAX_PREVIEW_LENGTH;
	return `${preview.slice(0, MAX_PREVIEW_LENGTH)}\n\n… ${omitted} more characters omitted`;
}

export default function manualModeExtension(pi: ExtensionAPI): void {
	let enabled = false;

	pi.registerFlag("manual", {
		description: "Start with manual approval mode enabled",
		type: "boolean",
		default: false,
	});

	function updateStatus(ctx: ExtensionContext): void {
		ctx.ui.setStatus(
			STATUS_ID,
			enabled ? ctx.ui.theme.fg("warning", "✋ manual") : undefined,
		);
	}

	function persistState(): void {
		pi.appendEntry<ManualModeState>(STATE_ENTRY_TYPE, { enabled });
	}

	function setEnabled(nextEnabled: boolean, ctx: ExtensionContext, persist = true): void {
		enabled = nextEnabled;
		updateStatus(ctx);
		if (persist) persistState();
		ctx.ui.notify(
			enabled
				? "Manual mode enabled. Writes, commands, and other custom tools require approval."
				: "Manual mode disabled. Tool calls will run normally.",
			"info",
		);
	}

	function restoreState(ctx: ExtensionContext): void {
		let restored: boolean | undefined;

		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "custom" || entry.customType !== STATE_ENTRY_TYPE) continue;
			const state = entry.data as ManualModeState | undefined;
			if (typeof state?.enabled === "boolean") restored = state.enabled;
		}

		enabled = restored ?? pi.getFlag("manual") === true;
		updateStatus(ctx);
	}

	pi.registerCommand("manual", {
		description: "Toggle manual approval mode (on, off, toggle, status)",
		getArgumentCompletions: (prefix) => {
			const actions = ["on", "off", "toggle", "status"];
			const matches = actions.filter((action) => action.startsWith(prefix.trim().toLowerCase()));
			return matches.length > 0 ? matches.map((action) => ({ value: action, label: action })) : null;
		},
		handler: async (args, ctx) => {
			const action = args.trim().toLowerCase() || "toggle";

			if (action === "status") {
				ctx.ui.notify(`Manual mode is ${enabled ? "enabled" : "disabled"}.`, "info");
				return;
			}

			if (action === "on") {
				setEnabled(true, ctx);
				return;
			}

			if (action === "off") {
				setEnabled(false, ctx);
				return;
			}

			if (action === "toggle") {
				setEnabled(!enabled, ctx);
				return;
			}

			ctx.ui.notify("Usage: /manual [on|off|toggle|status]", "error");
		},
	});

	pi.registerShortcut("ctrl+alt+m", {
		description: "Toggle manual approval mode",
		handler: async (ctx) => setEnabled(!enabled, ctx),
	});

	pi.on("session_start", async (_event, ctx) => restoreState(ctx));
	pi.on("session_tree", async (_event, ctx) => restoreState(ctx));

	pi.on("before_agent_start", async (event) => {
		if (!enabled) return;

		return {
			systemPrompt: `${event.systemPrompt}\n\nManual approval mode is active. Read, search, and ask_user_question tools run automatically. Every write, shell command, and other custom tool call is presented to the user for approval before execution. Do not claim that a gated action succeeded unless its tool result confirms execution.`,
		};
	});

	pi.on("tool_call", async (event, ctx) => {
		if (!enabled || !requiresApproval(event.toolName)) return;

		if (!ctx.hasUI) {
			return {
				block: true,
				reason: `Manual mode blocked ${event.toolName}: no approval UI is available`,
			};
		}

		const approved = await ctx.ui.confirm(
			`Allow ${event.toolName}?`,
			formatToolPreview(event.toolName, event.input),
		);

		if (!approved) {
			return {
				block: true,
				reason: `Manual mode: ${event.toolName} was denied by the user`,
			};
		}
	});
}
