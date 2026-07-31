import type { FastifyBaseLogger } from "fastify";

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: (error: unknown) => boolean;
}

/**
 * Retry a function with exponential backoff + jitter.
 * Default: 3 retries, 500ms base delay, 10s max delay.
 * Retries on network errors and 429/5xx by default.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  log: FastifyBaseLogger,
  label: string,
  opts: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 500,
    maxDelayMs = 10_000,
    retryOn = defaultRetryCheck,
  } = opts;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !retryOn(error)) {
        throw error;
      }

      const delay = Math.min(
        baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs,
        maxDelayMs,
      );

      log.warn(
        { attempt: attempt + 1, maxRetries, delayMs: Math.round(delay), label },
        "Retrying after error",
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

function defaultRetryCheck(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes("fetch failed") || error.message.includes("ECONNRESET")) {
      return true;
    }
    // HTTP 429 or 5xx
    const statusMatch = error.message.match(/(\d{3})/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      if (status === 429 || status >= 500) return true;
    }
  }
  return true; // Default: retry on any error
}
