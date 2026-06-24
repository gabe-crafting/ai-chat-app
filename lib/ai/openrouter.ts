import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { env } from "@/lib/env";

/** Cap output tokens so OpenRouter does not reserve huge defaults (e.g. Grok 65536). */
export const AI_MAX_OUTPUT_TOKENS = 4096;

export function getOpenRouter() {
  return createOpenRouter({
    apiKey: env.openRouterApiKey,
    headers: {
      "HTTP-Referer": env.appUrl,
      "X-Title": "AI Chat Rooms",
    },
  });
}
