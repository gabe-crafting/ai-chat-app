import type { OpenRouterChatSettings } from "@openrouter/ai-sdk-provider";

import { env } from "@/lib/env";

/**
 * Short A/B for AI response quality vs baseline OpenRouter chat.
 *
 * Enable only on non-prod deploys with:
 *   AI_QUALITY_EXPERIMENT=1
 *
 * Shared treatment (all models):
 * - Richer multi-speaker system prompt (no "be concise")
 * - Speaker labels in model history
 * - Higher output budget
 *
 * Grok-only extras:
 * - Medium reasoning (hidden from clients)
 * - Web plugin (native web + X search on xAI; auto elsewhere)
 *
 * Important: web/search uses tool calls, so the chat route must raise
 * streamText stopWhen above the default stepCountIs(1).
 */

export const AI_QUALITY_EXPERIMENT_MAX_OUTPUT_TOKENS = 16_384;

/** Allow tool-using web search to run a few rounds before finishing. */
export const AI_QUALITY_EXPERIMENT_MAX_STEPS = 5;

export function isAiQualityExperimentEnabled(): boolean {
  return env.aiQualityExperiment;
}

export function modelSupportsExperimentTools(modelId: string): boolean {
  return modelId.startsWith("x-ai/");
}

export function getExperimentSystemPrompt(supportsImageOutput: boolean): string {
  if (supportsImageOutput) {
    return [
      "You are a thoughtful assistant in a multi-user group chat room.",
      "Messages are labeled with speaker names and appear in chronological order.",
      "Answer the latest user request thoroughly: reason carefully, use relevant room context, and be clear.",
      "You can analyze images and create or edit images when asked; when generating or editing an image, also include a short text description.",
      "Prefer substance over brevity. If web/X search is available, use it when facts may be outdated or time-sensitive.",
    ].join(" ");
  }

  return [
    "You are a thoughtful assistant in a multi-user group chat room.",
    "Messages are labeled with speaker names and appear in chronological order.",
    "Answer the latest user request thoroughly: reason carefully, use relevant room context, and be clear.",
    "Prefer substance over brevity. If web/X search is available, use it when facts may be outdated or time-sensitive.",
  ].join(" ");
}

export function getBaselineSystemPrompt(supportsImageOutput: boolean): string {
  return supportsImageOutput
    ? "You are a helpful assistant in a group chat room. You can analyze images and create or edit images when asked. Messages appear in chronological order. Respond clearly; when generating or editing an image, also include a short text description."
    : "You are a helpful assistant participating in a group chat room. Messages appear in chronological order. Respond clearly and concisely to the latest user message.";
}

/** OpenRouter model settings for the treatment arm. */
export function getExperimentModelSettings(
  modelId: string,
): OpenRouterChatSettings | null {
  if (!modelSupportsExperimentTools(modelId)) {
    return null;
  }

  return {
    plugins: [
      {
        id: "web",
        // Omit engine so OpenRouter uses native on xAI and falls back elsewhere.
        max_results: 5,
      },
    ],
    reasoning: {
      effort: "medium",
      exclude: true,
    },
  };
}
