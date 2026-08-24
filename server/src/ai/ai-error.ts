import { AppError } from "../shared/errors.js";

/**
 * Categories of AI failure the user can act on.
 *
 * Everything else is reported as a generic failure: a user cannot do anything
 * useful with an internal provider message, and those messages routinely
 * contain JSON, model names, and billing URLs.
 */
export type AiErrorKind = "quota" | "auth" | "timeout" | "unavailable" | "unknown";

/** Formats a retry delay as a short, readable phrase. */
function describeWait(seconds: number): string {
  if (seconds < 60) return `about ${Math.ceil(seconds)} seconds`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `about ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `about ${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Extracts a retry delay from a provider error, in seconds.
 *
 * Providers write this several ways: Groq uses "try again in 24.87s" and
 * "try again in 3m21.5s", while Gemini uses "retry in 41.6s" and a retryDelay
 * field. Compound values must be read whole, since matching only the leading
 * number would report three seconds for a three-minute wait.
 */
function extractRetrySeconds(raw: string): number | null {
  // Matches "3m21.5s", "3m", "21.5s", with an optional hours component.
  const compound =
    /(?:retry|try again) in\s*(?:([\d.]+)h)?\s*(?:([\d.]+)m)?\s*(?:([\d.]+)s)?/i.exec(raw);

  if (compound && (compound[1] || compound[2] || compound[3])) {
    const hours = Number(compound[1] ?? 0);
    const minutes = Number(compound[2] ?? 0);
    const seconds = Number(compound[3] ?? 0);
    const total = hours * 3600 + minutes * 60 + seconds;
    if (total > 0) return total;
  }

  // Gemini reports the same information in a structured field.
  const retryDelay = /"retryDelay"\s*:\s*"([\d.]+)s"/i.exec(raw);
  if (retryDelay) {
    const value = Number(retryDelay[1]);
    if (!Number.isNaN(value) && value > 0) return value;
  }

  return null;
}

/** Classifies a raw provider error into something a user can understand. */
function classify(raw: string): AiErrorKind {
  const text = raw.toLowerCase();

  if (
    text.includes("quota") ||
    text.includes("rate limit") ||
    text.includes("429") ||
    text.includes("resource_exhausted") ||
    text.includes("insufficient_quota") ||
    text.includes("no credits")
  ) {
    return "quota";
  }

  if (
    text.includes("api key") ||
    text.includes("unauthorized") ||
    text.includes("401") ||
    text.includes("permission_denied")
  ) {
    return "auth";
  }

  if (text.includes("timeout") || text.includes("etimedout") || text.includes("aborted")) {
    return "timeout";
  }

  if (
    text.includes("503") ||
    text.includes("500") ||
    text.includes("unavailable") ||
    text.includes("overloaded") ||
    text.includes("econnrefused")
  ) {
    return "unavailable";
  }

  return "unknown";
}

/**
 * Converts a provider error into a message intended for the person using the
 * product.
 *
 * Provider errors are written for developers: they carry JSON, status codes,
 * model identifiers, and billing links. None of that helps someone writing a
 * resume, so the raw text is logged for us and replaced with plain language
 * for them.
 *
 * @param cause - The original error thrown by a provider.
 * @param providerName - Used only for server-side logging.
 * @returns An AppError carrying a user-facing message.
 */
export function toUserFacingAiError(cause: unknown, providerName: string): AppError {
  const raw = cause instanceof Error ? cause.message : String(cause);

  // Kept server-side: the detail matters when debugging, never to the user.
  console.error(`[ai:${providerName}]`, raw);

  const kind = classify(raw);
  const retrySeconds = extractRetrySeconds(raw);

  switch (kind) {
    case "quota": {
      const wait = retrySeconds
        ? ` Please try again in ${describeWait(retrySeconds)}.`
        : " Please try again a little later.";
      return new AppError(
        429,
        `The assistant has reached its usage limit for now.${wait} Your conversation is saved, so nothing is lost.`,
      );
    }

    case "auth":
      return new AppError(
        502,
        "The assistant is not configured correctly at the moment. We have been notified, so please try again shortly.",
      );

    case "timeout":
      return new AppError(
        504,
        "The assistant took too long to respond. Please send your message again.",
      );

    case "unavailable":
      return new AppError(
        503,
        "The assistant is temporarily unavailable. Please try again in a moment.",
      );

    default:
      return new AppError(
        502,
        "Something went wrong while writing that reply. Please try again.",
      );
  }
}
