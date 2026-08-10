import type {
  AiMessage,
  AiProvider,
  AiResponse,
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
 * Upper bound on injected resume text, roughly 6 to 8 pages.
 *
 * Resumes beyond this are truncated: the opening pages carry contact details
 * and recent roles, which is what tailoring depends on, and an unbounded
 * document would otherwise dominate every request.
 */
const MAX_RESUME_CONTEXT_CHARS = 12_000;

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

/** Truncates over-long resume text at a paragraph boundary where possible. */
function capResumeText(text: string): string {
  if (text.length <= MAX_RESUME_CONTEXT_CHARS) return text;
  const clipped = text.slice(0, MAX_RESUME_CONTEXT_CHARS);
  const lastBreak = clipped.lastIndexOf("\n");
  const body = lastBreak > MAX_RESUME_CONTEXT_CHARS * 0.8 ? clipped.slice(0, lastBreak) : clipped;
  return `${body}\n\n[Resume truncated. Ask the user about anything missing rather than assuming.]`;
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
  const messages: AiMessage[] = [
    { role: "system", content: RESUME_CHAT_SYSTEM_PROMPT },
  ];

  const pinned: string[] = [];

  if (context.jobDescription && !alreadyInHistory(history, context.jobDescription)) {
    pinned.push(`## Target job description\n\n${context.jobDescription}`);
  }

  if (context.resumeContext && !alreadyInHistory(history, context.resumeContext)) {
    pinned.push(
      `## Text extracted from the user's uploaded resume\n\n${capResumeText(context.resumeContext)}`,
    );
  }

  if (pinned.length) {
    messages.push({ role: "system", content: pinned.join("\n\n") });
  }

  return [...messages, ...history];
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
