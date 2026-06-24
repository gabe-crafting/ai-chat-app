export const AI_MODELS = [
  {
    id: "openai/gpt-4.1-nano",
    label: "ChatGPT Nano",
    vision: false,
    imageOutput: false,
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o Mini",
    vision: true,
    imageOutput: false,
  },
  {
    id: "google/gemini-2.5-flash-image",
    label: "Gemini Image",
    vision: true,
    imageOutput: true,
  },
  {
    id: "x-ai/grok-4.3",
    label: "Grok 4.3",
    vision: true,
    imageOutput: false,
  },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]["id"];
export type AiModel = (typeof AI_MODELS)[number];

export const DEFAULT_AI_MODEL: AiModelId = AI_MODELS[0].id;

/** OpenRouter removed Grok 3; map stored room values to the replacement. */
const LEGACY_MODEL_ALIASES: Record<string, AiModelId> = {
  "x-ai/grok-3": "x-ai/grok-4.3",
};

export const AI_MODEL_ITEMS = AI_MODELS.map((model) => ({
  value: model.id,
  label: model.label,
}));

export function isAllowedModel(model: string): model is AiModelId {
  return AI_MODELS.some((entry) => entry.id === model);
}

export function normalizeModelId(model: string): AiModelId {
  const resolved = LEGACY_MODEL_ALIASES[model] ?? model;
  return isAllowedModel(resolved) ? resolved : DEFAULT_AI_MODEL;
}

export function getModelLabel(model: string) {
  const resolved = normalizeModelId(model);
  return AI_MODELS.find((entry) => entry.id === resolved)?.label ?? model;
}

export function getModelConfig(model: string): AiModel {
  const resolved = normalizeModelId(model);
  return AI_MODELS.find((entry) => entry.id === resolved) ?? AI_MODELS[0];
}

export function modelSupportsVision(model: string) {
  return getModelConfig(model).vision;
}

export function modelSupportsImageOutput(model: string) {
  return getModelConfig(model).imageOutput;
}
