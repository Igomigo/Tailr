import { getProvider } from "./ai.service.js";
import { CHAT_TITLE_PROMPT } from "./prompts/chat-title.prompt.js";

/**
 * Hard ceiling on a generated title.
 *
 * The prompt asks for about 60 characters; this sits above that so a title
 * that runs slightly long is kept as written, and only a model ignoring the
 * instruction outright gets cut. The sidebar truncates what it cannot fit, so
 * the ceiling exists to bound what is stored, not to control appearance.
 */
const MAX_TITLE_CHARS = 72;

/** Enough of each message to identify the topic without paying for the rest. */
const SAMPLE_CHARS = 2_000;

/**
 * Strips what models commonly add despite being told not to.
 *
 * Wrapping quotes and a trailing full stop are the two habits that survive an
 * explicit instruction, and both look wrong in a sidebar row.
 */
function clean(raw: string): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();

  const unquoted = collapsed.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  const unpunctuated = unquoted.replace(/[.。]+$/, "").trim();

  if (unpunctuated.length <= MAX_TITLE_CHARS) return unpunctuated;

  // Cut at a word boundary so the result never ends mid-word.
  const clipped = unpunctuated.slice(0, MAX_TITLE_CHARS);
  const lastSpace = clipped.lastIndexOf(" ");
  return (lastSpace > MAX_TITLE_CHARS * 0.6 ? clipped.slice(0, lastSpace) : clipped).trim();
}

/**
 * Names a conversation from its first exchange.
 *
 * Returns null rather than throwing: a title is cosmetic, and the caller
 * already holds a usable fallback derived from the user's own message. A
 * failure here must never affect the reply the user is waiting for.
 *
 * @param userMessage - The user's opening message.
 * @param assistantReply - The assistant's first reply, which disambiguates a
 *   terse opener such as "help me with this".
 */
export async function generateChatTitle(
  userMessage: string,
  assistantReply: string,
): Promise<string | null> {
  try {
    const response = await getProvider().complete({
      messages: [
        { role: "system", content: CHAT_TITLE_PROMPT },
        {
          role: "user",
          content:
            `First message from the user:\n${userMessage.slice(0, SAMPLE_CHARS)}\n\n` +
            `The assistant replied:\n${assistantReply.slice(0, SAMPLE_CHARS)}`,
        },
      ],
      maxTokens: 500,
    });

    const title = clean(response.content ?? "");
    return title || null;
  } catch (error) {
    console.error(
      "[chat-title] failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
