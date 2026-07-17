export async function readApiJson<T extends Record<string, unknown>>(
  response: Response,
): Promise<{ data: T | null; error: string | null }> {
  const text = await response.text();

  if (!text.trim()) {
    if (!response.ok) {
      return {
        data: null,
        error: `Request failed (${response.status}).`,
      };
    }
    return { data: null, error: null };
  }

  try {
    const data = JSON.parse(text) as T;
    if (!response.ok) {
      const message =
        typeof data.error === "string" && data.error.trim()
          ? data.error
          : `Request failed (${response.status}).`;
      return { data: null, error: message };
    }
    return { data, error: null };
  } catch {
    const trimmed = text.trim();
    const plain =
      trimmed.startsWith("<") || trimmed.startsWith("<!")
        ? `Request failed (${response.status}). The server returned an error page — this often means the AI request timed out.`
        : trimmed.slice(0, 280);

    return {
      data: null,
      error: plain || `Request failed (${response.status}).`,
    };
  }
}
