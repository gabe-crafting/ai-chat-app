import { APICallError, NoOutputGeneratedError } from "ai";

const INSUFFICIENT_CREDITS_RE =
  /credits|can only afford|payment required|insufficient.*(balance|funds|credit)/i;

export function formatChatErrorMessage(
  raw: string,
  statusCode?: number,
): string {
  if (
    statusCode === 402 ||
    INSUFFICIENT_CREDITS_RE.test(raw) ||
    raw.toLowerCase().includes("fewer max_tokens")
  ) {
    return (
      "Not enough OpenRouter credits for this model. Add credits at " +
      "https://openrouter.ai/settings/credits or choose a cheaper model " +
      "(e.g. ChatGPT Nano)."
    );
  }

  return raw;
}

export function getChatErrorResponse(error: unknown): {
  message: string;
  status: number;
} {
  const resolved =
    NoOutputGeneratedError.isInstance(error) && error.cause
      ? error.cause
      : error;

  if (APICallError.isInstance(resolved)) {
    const apiMessage = (
      resolved.data as { error?: { message?: string } } | undefined
    )?.error?.message;
    const raw =
      typeof apiMessage === "string" && apiMessage.trim()
        ? apiMessage
        : resolved.message;
    const status = resolved.statusCode ?? 502;
    return { message: formatChatErrorMessage(raw, status), status };
  }

  if (resolved instanceof Error) {
    return {
      message: formatChatErrorMessage(resolved.message),
      status: 500,
    };
  }

  return { message: "Failed to generate response.", status: 500 };
}
