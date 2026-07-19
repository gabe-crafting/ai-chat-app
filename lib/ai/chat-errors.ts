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

function unwrapChatError(error: unknown): unknown {
  if (NoOutputGeneratedError.isInstance(error) && error.cause) {
    return error.cause;
  }
  return error;
}

export function getChatErrorResponse(error: unknown): {
  message: string;
  status: number;
} {
  const resolved = unwrapChatError(error);

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
    const message = formatChatErrorMessage(resolved.message);
    // Surface a clearer fallback when the stream died with no provider message.
    if (
      NoOutputGeneratedError.isInstance(error) &&
      (!message || message === "No output generated. Check the stream for errors.")
    ) {
      return {
        message:
          "The model returned no text (often a tool/search step failed). Try again or pick another model.",
        status: 502,
      };
    }

    return { message, status: 500 };
  }

  return { message: "Failed to generate response.", status: 500 };
}
