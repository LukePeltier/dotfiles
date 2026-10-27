// Pi's loader supports /compat; importing /api/*.lazy directly breaks its aliases.
import {
  createProvider,
  envApiKeyAuth,
  openAICompletionsApi,
  type Model,
} from "@earendil-works/pi-ai/compat";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Run /login 9router to store your dashboard API key, or set NINEROUTER_KEY.
// Then use /model and search for 9router. Pi refreshes and caches the catalog.
const BASE_URL = "https://9router.shire-chicken.ts.net/v1";

// /v1/models does not expose combo membership. Keep this in sync with
// Dashboard → Combos whenever you change the fallback chain in 9Router.
const COMBO_MEMBERS: Record<string, string[]> = {
  "3-tier-fallback": [
    "cx/gpt-6-astra",
    "openrouter/z-ai/glm-5.3-flash",
    "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free",
  ],
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function tokenLimit(fallback: number, ...values: unknown[]): number {
  return (
    values.find(
      (value): value is number =>
        typeof value === "number" && Number.isSafeInteger(value) && value > 0,
    ) ?? fallback
  );
}

export default function (pi: ExtensionAPI) {
  pi.registerProvider(
    createProvider({
      id: "9router",
      name: "9Router",
      baseUrl: BASE_URL,
      auth: { apiKey: envApiKeyAuth("9Router API key", ["NINEROUTER_KEY"]) },
      // createProvider takes streaming methods, not the legacy API-name string.
      api: openAICompletionsApi(),
      models: [],
      async fetchModels({ credential, signal }) {
        const key = credential?.type === "api_key" ? credential.key : undefined;
        if (!key) throw new Error("Run /login 9router or set NINEROUTER_KEY.");

        const response = await fetch(`${BASE_URL}/models`, {
          headers: {
            Authorization: `Bearer ${key}`,
            Accept: "application/json",
          },
          redirect: "error",
          signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
        });
        if (!response.ok) {
          // Do not echo server bodies, which could contain credentials.
          throw new Error(
            response.status === 401 || response.status === 403
              ? "9Router rejected the API key. Run /login 9router with a key from Dashboard → Keys."
              : `9Router model discovery failed (HTTP ${response.status}).`,
          );
        }

        const payload = record(await response.json());
        if (!Array.isArray(payload.data))
          throw new Error("9Router returned an invalid model catalog.");

        const models: Model[] = [];
        const seen = new Set<string>();
        for (const value of payload.data) {
          const model = record(value);
          if (
            typeof model.id !== "string" ||
            !model.id.trim() ||
            seen.has(model.id)
          )
            continue;
          seen.add(model.id);
          const caps = record(model.capabilities);
          const contextWindow = tokenLimit(
            128_000,
            model.context_length,
            model.context_window,
            caps.contextWindow,
          );
          models.push({
            id: model.id, // Preserve routing prefixes and combo names verbatim.
            name: typeof model.name === "string" ? model.name : model.id,
            provider: "9router",
            api: "openai-completions",
            baseUrl: BASE_URL,
            reasoning: caps.reasoning === true,
            input: caps.vision === true ? ["text", "image"] : ["text"],
            contextWindow,
            maxTokens: Math.min(
              contextWindow,
              tokenLimit(
                4096,
                model.max_completion_tokens,
                model.max_tokens,
                caps.maxOutput,
              ),
            ),
            // Catalog pricing is unavailable; zero means untracked, not free.
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            compat: {
              supportsStore: false,
              supportsDeveloperRole: false,
              supportsStrictMode: false,
              maxTokensField: "max_tokens",
            },
          });
        }
        if (payload.data.length > 0 && models.length === 0) {
          throw new Error("9Router returned no valid model IDs.");
        }
        // Resolve after parsing the whole catalog: combos usually appear first.
        const byId = new Map(models.map((model) => [model.id, model]));
        for (const [comboId, memberIds] of Object.entries(COMBO_MEMBERS)) {
          const combo = byId.get(comboId);
          if (!combo || memberIds.length === 0) continue;
          const members = memberIds.map((id) => byId.get(id));
          // Unknown members use the same defaults as missing model metadata.
          combo.contextWindow = Math.min(...members.map((m) => m?.contextWindow ?? 128_000));
          combo.maxTokens = Math.min(
            combo.contextWindow,
            ...members.map((m) => m?.maxTokens ?? 4096),
          );
        }
        return models;
      },
    }),
  );
}
