import assert from "node:assert/strict";
import { describe, it } from "node:test";
import manualModeExtension, { formatToolPreview, requiresApproval } from "./index.ts";

interface HarnessOptions {
	approved?: boolean;
	hasUI?: boolean;
}

function createHarness(options: HarnessOptions = {}) {
	const handlers = new Map<string, (...args: any[]) => any>();
	const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
	const entries: Array<{ type: "custom"; customType: string; data: unknown }> = [];
	const confirmations: Array<{ title: string; message: string }> = [];

	const pi = {
		registerFlag() {},
		getFlag() {
			return false;
		},
		registerShortcut() {},
		registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) {
			commands.set(name, command);
		},
		on(name: string, handler: (...args: any[]) => any) {
			handlers.set(name, handler);
		},
		appendEntry(customType: string, data: unknown) {
			entries.push({ type: "custom", customType, data });
		},
	};

	const ctx = {
		hasUI: options.hasUI ?? true,
		ui: {
			theme: { fg: (_color: string, text: string) => text },
			setStatus() {},
			notify() {},
			async confirm(title: string, message: string) {
				confirmations.push({ title, message });
				return options.approved ?? false;
			},
		},
		sessionManager: {
			getBranch: () => entries,
		},
	};

	manualModeExtension(pi as any);

	return { commands, confirmations, ctx, handlers };
}

async function enableManualMode(harness: ReturnType<typeof createHarness>) {
	await harness.commands.get("manual")!.handler("on", harness.ctx);
}

describe("requiresApproval", () => {
	it("auto-allows built-in inspection tools", () => {
		for (const tool of ["read", "grep", "find", "ls", "ask_user_question"]) {
			assert.equal(requiresApproval(tool), false, tool);
		}
	});

	it("requires approval for writes, commands, and unknown tools", () => {
		for (const tool of ["edit", "write", "bash", "deploy", "custom_tool"]) {
			assert.equal(requiresApproval(tool), true, tool);
		}
	});
});

describe("formatToolPreview", () => {
	it("shows bash commands without JSON wrapping", () => {
		assert.equal(formatToolPreview("bash", { command: "npm test", timeout: 30 }), "npm test");
	});

	it("truncates oversized tool inputs", () => {
		const preview = formatToolPreview("write", { content: "x".repeat(7_000) });

		assert.match(preview, /more characters omitted$/);
		assert.ok(preview.length < 7_000);
	});
});

describe("manual mode tool gate", () => {
	it("does not prompt while manual mode is disabled", async () => {
		const harness = createHarness();

		const result = await harness.handlers.get("tool_call")!(
			{ toolName: "edit", input: { path: "a.ts" } },
			harness.ctx,
		);

		assert.equal(result, undefined);
		assert.deepEqual(harness.confirmations, []);
	});

	it("allows inspection and user-question tools without prompting when enabled", async () => {
		const harness = createHarness();
		await enableManualMode(harness);

		for (const toolCall of [
			{ toolName: "read", input: { path: "a.ts" } },
			{ toolName: "ask_user_question", input: { questions: [] } },
		]) {
			const result = await harness.handlers.get("tool_call")!(toolCall, harness.ctx);
			assert.equal(result, undefined);
		}

		assert.deepEqual(harness.confirmations, []);
	});

	it("executes an approved command", async () => {
		const harness = createHarness({ approved: true });
		await enableManualMode(harness);

		const result = await harness.handlers.get("tool_call")!(
			{ toolName: "bash", input: { command: "npm test" } },
			harness.ctx,
		);

		assert.equal(result, undefined);
		assert.deepEqual(harness.confirmations, [{ title: "Allow bash?", message: "npm test" }]);
	});

	it("blocks a denied write", async () => {
		const harness = createHarness({ approved: false });
		await enableManualMode(harness);

		const result = await harness.handlers.get("tool_call")!(
			{ toolName: "write", input: { path: "a.ts", content: "hello" } },
			harness.ctx,
		);

		assert.deepEqual(result, {
			block: true,
			reason: "Manual mode: write was denied by the user",
		});
	});

	it("fails closed when approval UI is unavailable", async () => {
		const harness = createHarness({ hasUI: false });
		await enableManualMode(harness);

		const result = await harness.handlers.get("tool_call")!(
			{ toolName: "custom_tool", input: {} },
			harness.ctx,
		);

		assert.deepEqual(result, {
			block: true,
			reason: "Manual mode blocked custom_tool: no approval UI is available",
		});
	});
});
