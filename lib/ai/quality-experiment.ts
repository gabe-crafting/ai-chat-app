import { env } from "@/lib/env";

/**
 * Optional quality experiment toggled with AI_QUALITY_EXPERIMENT=1.
 * Does not inject default system prompts — use the room system prompt instead.
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

export function resolveSystemPrompt(
  customPrompt: string | null | undefined,
): string | undefined {
  const trimmed = customPrompt?.trim();
  if (!trimmed) {
    return undefined;
  }

  return [
    trimmed,
    "You are in a multi-user chat room. Follow the instructions above for every reply—persona, tone, and style. Do not slip back into a generic assistant voice because of earlier room messages.",
  ].join("\n\n");
}
