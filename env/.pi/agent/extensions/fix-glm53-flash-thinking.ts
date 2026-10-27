import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  let enabled = false;

  function updateModel(provider?: string, id?: string) {
    enabled =
      provider === "openrouter" &&
      id === "z-ai/glm-5.3-flash";
  }

  // Initialize for the model already selected when the session loads.
  pi.on("session_start", (_event, ctx) => {
    updateModel(ctx.model?.provider, ctx.model?.id);
  });

  // Keep the transformer state correct when switching models.
  pi.on("model_select", (event) => {
    updateModel(event.model.provider, event.model.id);
  });

  pi.registerMarkdownTransformer((markdown, ctx) => {
    if (!enabled || ctx.messageType !== "assistant-thinking") {
      return markdown;
    }

    return markdown.replace(/\r?\n/g, "");
  });
}
