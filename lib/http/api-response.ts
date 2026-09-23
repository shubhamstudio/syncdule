type ErrorPayload = {
  error?: unknown;
};

/** Reads the safe error returned by an API route without exposing raw HTML/errors. */
export async function getApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as ErrorPayload;
    return typeof body.error === "string" && body.error.trim()
      ? body.error
      : fallback;
  } catch {
    return fallback;
  }
}
