import type { OpenRouterChatSettings } from "@openrouter/ai-sdk-provider";

export const AI_REASONING_EFFORTS = [
  { value: "off", label: "Off" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export type AiReasoningEffort = (typeof AI_REASONING_EFFORTS)[number]["value"];

export function normalizeAiReasoningEffort(
  value: string | null | undefined,
): AiReasoningEffort {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return "off";
}

export function buildOpenRouterChatSettings(
  modelId: string,
  reasoningEffort: AiReasoningEffort,
  options?: { enableWebSearch?: boolean },
): OpenRouterChatSettings | null {
  const settings: OpenRouterChatSettings = {};

  if (reasoningEffort !== "off") {
    settings.reasoning = {
      effort: reasoningEffort,
      exclude: true,
    };
  }

  if (options?.enableWebSearch && modelId.startsWith("x-ai/")) {
    settings.plugins = [
      {
        id: "web",
        max_results: 5,
      },
    ];
  }

  return Object.keys(settings).length > 0 ? settings : null;
}
