import type {
  AiMessage,
  AiProvider,
  AiResponse,
  AiStreamChunk,
  AiToolDefinition,
} from "./ai-provider.interface.js";
import { createOpenAiProvider } from "./openai.provider.js";
import { createGeminiProvider } from "./gemini.provider.js";
import { RESUME_CHAT_SYSTEM_PROMPT } from "./prompts/resume-chat-system.prompt.js";
import { env } from "../config/env.js";

let provider: AiProvider | null = null;

/**
 * Returns the configured AI provider, creating it on first use.
 *
 * Construction is lazy so the server still boots without an API key — only
 * routes that actually reach the AI fail, which keeps the rest testable.
 */
export function getProvider(): AiProvider {
  if (provider) return provider;

  switch (env.AI_PROVIDER) {
    case "openai":
      provider = createOpenAiProvider();
      return provider;
    case "gemini":
      provider = createGeminiProvider();
      return provider;
    default:
      throw new Error(`Unknown AI provider: ${String(env.AI_PROVIDER)}`);
  }
}

/** Pinned session context injected ahead of the message history. */
export interface SessionContext {
  jobDescription?: string | null;
  resumeContext?: string | null;
}

/**
 * Ceiling on the whole request, in characters.
 *
 * Providers reject an over-large request outright, so the user gets an error
 * instead of a reply. This is a backstop against a pathological upload, not a
 * routine budget: a long resume and a long job description together come to a
 * small fraction of it, so nothing a real user sends should ever be trimmed.
 *
 * Sized against the smallest context window we target — 400,000 tokens, at
 * roughly four characters per token — with a wide margin left for the reply,
 * the tool schemas, and the fact that the ratio is only an approximation.
 */
const MAX_REQUEST_CHARS = 600_000;

/** Room reserved for the model's own reply within that ceiling. */
const RESPONSE_HEADROOM_CHARS = 24_000;

/**
 * Reports whether pinned text already appears in the replayed history.
 *
 * Compares a distinctive slice rather than the whole string so the check stays
 * cheap on long documents.
 */
function alreadyInHistory(history: AiMessage[], text: string): boolean {
  const probe = text.slice(0, 200);
  return history.some((message) => message.content?.includes(probe));
}

/**
 * Trims text to a budget, cutting at a line break where one is close by.
 *
 * @param text - Text to trim.
 * @param budget - Maximum characters to keep.
 */
function trimTo(text: string, budget: number): string {
  if (text.length <= budget) return text;
  // A negative budget would make slice() count back from the end and keep most
  // of the text, the opposite of trimming.
  const clipped = text.slice(0, Math.max(0, budget));
  const lastBreak = clipped.lastIndexOf("\n");
  const body = lastBreak > budget * 0.8 ? clipped.slice(0, lastBreak) : clipped;
  return `${body}\n\n[Truncated. Ask the user about anything missing rather than assuming.]`;
}

/**
 * Describes the current date for the model.
 *
 * Language models have no clock and no notion of today's date, so without this
 * they cannot work out whether a role is current, how long someone has been in
 * a job, or what "the last three years" covers. Computed per request so a
 * long-running server never serves a stale date.
 */
function currentDateContext(): string {
  const now = new Date();

  const full = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

  return [
    `Today's date is ${full}. The current time is ${time} UTC.`,
    `The current year is ${now.getUTCFullYear()}.`,
    "Use this whenever dates matter: working out how long someone has held a role, deciding whether a position is current, judging how recent a qualification is, or interpreting phrases such as \"last year\". Never guess the date or rely on your training data for it.",
  ].join(" ");
}

/**
 * Builds the message list sent to the model.
 *
 * Session context is re-injected only when it has dropped out of the replayed
 * history. Uploaded resumes run to thousands of tokens, so pinning them to
 * every request would duplicate text the history already carries and inflate
 * cost on every turn. Once the window slides past the upload, the text is
 * injected again so the model never loses the user's actual experience.
 *
 * @param history - Recent conversation in chronological order.
 * @param context - Session-level content available for injection.
 */
export function buildMessages(history: AiMessage[], context: SessionContext = {}): AiMessage[] {
  const dateContext = currentDateContext();

  const messages: AiMessage[] = [
    { role: "system", content: RESUME_CHAT_SYSTEM_PROMPT },
    { role: "system", content: dateContext },
  ];

  // Everything the request must carry regardless, plus room for the reply.
  const fixedCost =
    RESUME_CHAT_SYSTEM_PROMPT.length + dateContext.length + RESPONSE_HEADROOM_CHARS;

  let budget = MAX_REQUEST_CHARS - fixedCost;

  // History is trimmed first, oldest dropped, because the pinned job
  // description and resume are what the model actually needs to tailor with.
  const trimmedHistory: AiMessage[] = [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index]!;
    const cost = (entry.content?.length ?? 0) + 40;
    if (cost > budget) break;
    budget -= cost;
    trimmedHistory.unshift(entry);
  }

  // Pinned in full. The ceiling is only reachable by a pathological upload, so
  // splitting the remaining budget between these two would add branching that
  // never runs for a real user; trimTo is left as the last line of defence.
  const pinned: string[] = [];

  for (const [heading, text] of [
    ["## Target job description", context.jobDescription],
    ["## Text extracted from the user's uploaded resume", context.resumeContext],
  ] as const) {
    if (!text || alreadyInHistory(history, text)) continue;

    const block = `${heading}\n\n${trimTo(text, budget)}`;
    pinned.push(block);
    budget -= block.length;
  }

  if (pinned.length) {
    messages.push({ role: "system", content: pinned.join("\n\n") });
  }

  return [...messages, ...trimmedHistory];
}


/**
 * Sends a conversation to the configured provider.
 *
 * @param history - Recent conversation in chronological order.
 * @param context - Session-level content to pin ahead of the history.
 * @param tools - Tools the model may call this turn.
 * @returns The model's reply: text, tool calls, or both.
 */
export async function sendMessage(
  history: AiMessage[],
  context: SessionContext = {},
  tools: AiToolDefinition[] = [],
): Promise<AiResponse> {
  return getProvider().complete({
    messages: buildMessages(history, context),
    tools,
  });
}

/**
 * Streams a reply from the configured provider.
 *
 * Yields text as it arrives, then a final chunk carrying the complete response
 * including any tool calls.
 *
 * @param history - Recent conversation in chronological order.
 * @param context - Session-level content available for injection.
 * @param tools - Tools the model may call this turn.
 */
export function streamMessage(
  history: AiMessage[],
  context: SessionContext = {},
  tools: AiToolDefinition[] = [],
): AsyncIterable<AiStreamChunk> {
  return getProvider().stream({
    messages: buildMessages(history, context),
    tools,
  });
}
