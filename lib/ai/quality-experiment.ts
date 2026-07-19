import { env } from "@/lib/env";

/**
 * Short A/B for AI response quality vs baseline OpenRouter chat.
 *
 * Enable only on non-prod deploys with:
 *   AI_QUALITY_EXPERIMENT=1
 *
 * Treatment vs control (current prod path):
 * - Richer multi-speaker system prompt (no "be concise")
 * - Speaker labels in model history
 * - OpenRouter reasoning (medium, hidden from clients)
 * - Native web plugin (web + X search for xAI)
 * - Higher output budget (reasoning needs headroom)
 */

export const AI_QUALITY_EXPERIMENT_MAX_OUTPUT_TOKENS = 16_384;

export function isAiQualityExperimentEnabled(): boolean {
  return env.aiQualityExperiment;
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
export function getExperimentModelSettings() {
  return {
    plugins: [
      {
        id: "web" as const,
        engine: "native" as const,
        max_results: 5,
      },
    ],
    reasoning: {
      effort: "medium" as const,
      exclude: true,
    },
  };
}
