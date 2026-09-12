import {
  ChatSessionModel,
  type ChatSessionDocument,
} from "./chat-session.model.js";
import {
  ChatMessageModel,
  type ChatMessageDocument,
} from "./chat-message.model.js";
import { notFound } from "../shared/errors.js";
import * as aiService from "../ai/ai.service.js";
import type { AiMessage, AiResponse } from "../ai/ai-provider.interface.js";
import { getToolDefinitions, executeTool } from "../ai/tools/ai-tools.service.js";
import {
  processUploadedFiles,
  combineParsedText,
  type IncomingFile,
} from "../files/uploaded-file.service.js";
import { UploadedFileModel } from "../files/uploaded-file.model.js";
import { generateChatTitle } from "../ai/chat-title.service.js";

/**
 * How many recent messages are replayed as AI context.
 *
 * Tailoring a resume is an iterative conversation, so the limit is set to keep
 * a whole session in view rather than to ration tokens: even a full window of
 * messages alongside the resume and job description uses a small fraction of
 * the model's context.
 */
const HISTORY_LIMIT = 100;

/** Characters of the first user message used to auto-title an untitled chat. */
const TITLE_LENGTH = 60;

/**
 * Creates a new chat session.
 *
 * @param title - Optional title; a placeholder is used until the first message
 *   arrives, at which point the session is retitled from that message.
 */
export async function createChatSession(
  userId: string,
  title?: string,
): Promise<ChatSessionDocument> {
  return ChatSessionModel.create({ userId, title: title ?? "New chat" });
}

/** Lists a user's chat sessions, most recently active first. */
export async function listChatSessions(userId: string): Promise<ChatSessionDocument[]> {
  return ChatSessionModel.find({ userId }).sort({ lastMessageAt: -1 }).limit(50);
}

/** Most matching conversations returned by one search. */
const SEARCH_LIMIT = 30;

/** Characters of surrounding text shown either side of a content match. */
const SNIPPET_PADDING = 60;

/** One conversation that matched a search, and why it matched. */
export interface SessionSearchResult {
  session: ChatSessionDocument;
  /** The matching message text, when the title itself did not match. */
  snippet: string | null;
}

/**
 * Escapes a user's query for use inside a regex.
 *
 * Without this the query is a pattern rather than text: a stray bracket makes
 * every search fail, and a crafted one such as `(a+)+$` backtracks long enough
 * to hold the process, which is a denial of service from a single request.
 */
function escapeRegex(query: string): string {
  return query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Takes the matching part of a message with a little text either side.
 *
 * A content match has to show the words it matched, or the result looks
 * unrelated to what was typed and reads as a bug.
 */
function buildSnippet(content: string, query: string): string {
  const at = content.toLowerCase().indexOf(query.toLowerCase());
  if (at === -1) return content.slice(0, SNIPPET_PADDING * 2).trim();

  const start = Math.max(0, at - SNIPPET_PADDING);
  const end = Math.min(content.length, at + query.length + SNIPPET_PADDING);

  return (
    (start > 0 ? "…" : "") +
    content.slice(start, end).trim() +
    (end < content.length ? "…" : "")
  );
}

/**
 * Finds a user's conversations by title or message content.
 *
 * Messages carry no owner of their own, so they are searched within the set of
 * sessions this user owns rather than matched first and attributed afterwards.
 * Ownership is therefore a property of the query, not something inferred from
 * a result.
 *
 * Title matches are returned before content matches: the title is what the
 * user named the conversation, so a hit there is the stronger signal. Within
 * each group the most recently active conversation comes first.
 *
 * @param userId - Owner whose conversations are searched.
 * @param query - Text to look for, matched case-insensitively anywhere in the
 *   title or a message.
 */
export async function searchChatSessions(
  userId: string,
  query: string,
): Promise<SessionSearchResult[]> {
  const pattern = new RegExp(escapeRegex(query), "i");

  const owned = await ChatSessionModel.find({ userId })
    .sort({ lastMessageAt: -1 })
    .limit(200);

  const titleMatches = owned.filter((session) => pattern.test(session.title));
  const titleMatchIds = new Set(titleMatches.map((s) => String(s._id)));

  // Only sessions that did not already match by title, so one conversation
  // cannot appear twice. Tool messages are excluded: they carry raw JSON meant
  // for the model, and a hit inside one points at text the user cannot see in
  // their transcript.
  const remaining = owned.filter((s) => !titleMatchIds.has(String(s._id)));

  const contentMatches = remaining.length
    ? await ChatMessageModel.find({
        chatSessionId: { $in: remaining.map((s) => s._id) },
        role: { $in: ["user", "assistant"] },
        content: pattern,
      })
        .sort({ createdAt: -1 })
        .limit(SEARCH_LIMIT * 4)
    : [];

  // Keeps the first match per conversation, which the sort above makes the
  // most recent one.
  const snippets = new Map<string, string>();
  for (const message of contentMatches) {
    const key = String(message.chatSessionId);
    if (!snippets.has(key) && message.content) {
      snippets.set(key, buildSnippet(message.content, query));
    }
  }

  const byId = new Map(remaining.map((s) => [String(s._id), s]));

  return [
    ...titleMatches.map((session) => ({ session, snippet: null })),
    ...[...snippets.entries()].flatMap(([id, snippet]) => {
      const session = byId.get(id);
      return session ? [{ session, snippet }] : [];
    }),
  ].slice(0, SEARCH_LIMIT);
}

/**
 * Loads a chat session the user owns.
 *
 * A session belonging to someone else reports as not found rather than
 * forbidden, so the response cannot be used to discover which ids exist.
 *
 * @throws AppError 404 when no session matches, or it belongs to another user.
 */
export async function getChatSession(
  chatId: string,
  userId: string,
): Promise<ChatSessionDocument> {
  const session = await ChatSessionModel.findOne({ _id: chatId, userId });
  if (!session) throw notFound("Chat session not found");
  return session;
}

/**
 * Renames a chat session.
 *
 * @param chatId - Session to rename.
 * @param userId - Owner, so another user's session cannot be renamed.
 * @param title - New title.
 * @throws AppError 404 when the session does not exist or belongs to someone else.
 */
export async function renameChatSession(
  chatId: string,
  userId: string,
  title: string,
): Promise<ChatSessionDocument> {
  const session = await getChatSession(chatId, userId);
  session.title = title;
  await session.save();
  return session;
}

/**
 * Deletes a chat session and everything belonging to it.
 *
 * Messages and uploaded-file records are removed too, since neither is
 * reachable once its session is gone.
 *
 * @param chatId - Session to delete.
 * @param userId - Owner, so another user's session cannot be deleted.
 * @throws AppError 404 when the session does not exist or belongs to someone else.
 */
export async function deleteChatSession(chatId: string, userId: string): Promise<void> {
  const session = await getChatSession(chatId, userId);

  await Promise.all([
    ChatMessageModel.deleteMany({ chatSessionId: session._id }),
    UploadedFileModel.deleteMany({ chatSessionId: session._id }),
  ]);

  await session.deleteOne();
}

/** Loads a session together with its messages in chronological order. */
export async function getChatSessionWithMessages(
  chatId: string,
  userId: string,
): Promise<{
  session: ChatSessionDocument;
  messages: ChatMessageDocument[];
}> {
  const session = await getChatSession(chatId, userId);
  const messages = await ChatMessageModel.find({
    chatSessionId: session._id,
  }).sort({
    createdAt: 1,
  });
  return { session, messages };
}

/**
 * Loads the most recent messages for a session in chronological order.
 *
 * Fetches newest-first so the limit keeps the *latest* messages, then reverses
 * to restore reading order for the AI.
 *
 * @param chatId - Session whose history to load.
 * @param limit - Maximum messages to return.
 */
export async function getRecentMessages(
  chatId: string,
  limit: number = HISTORY_LIMIT,
): Promise<ChatMessageDocument[]> {
  const messages = await ChatMessageModel.find({ chatSessionId: chatId })
    .sort({ createdAt: -1 })
    .limit(limit);
  return messages.reverse();
}

/**
 * Stores uploaded resume text on the session.
 *
 * The text is kept whole. Summarising it first would be lossy for no gain: a
 * long resume is a small share of the model's context, and the details a
 * summary drops — a specific metric, an early role — are exactly the ones a
 * tailored resume needs.
 *
 * @param session - Session to update.
 * @param uploadedFiles - Files attached to this message.
 */
function applyResumeContext(
  session: ChatSessionDocument,
  uploadedFiles: Awaited<ReturnType<typeof processUploadedFiles>>,
): void {
  const parsedText = combineParsedText(uploadedFiles);
  if (!parsedText) return;

  session.resumeContext = parsedText;
}

/** Derives a readable session title from the first user message. */
function deriveTitle(message: string): string {
  const collapsed = message.replace(/\s+/g, " ").trim();
  return collapsed.length <= TITLE_LENGTH
    ? collapsed
    : `${collapsed.slice(0, TITLE_LENGTH).trimEnd()}...`;
}

/** Converts stored messages into the provider-neutral AI format. */
function toAiMessages(messages: ChatMessageDocument[]): AiMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content ?? null,
    ...(message.toolCalls?.length
      ? {
          toolCalls: message.toolCalls.map((call) => ({
            id: call.id,
            name: call.name,
            arguments: call.arguments as Record<string, unknown>,
            ...(call.providerMetadata
              ? { providerMetadata: call.providerMetadata as Record<string, unknown> }
              : {}),
          })),
        }
      : {}),
    ...(message.toolCallId ? { toolCallId: message.toolCallId } : {}),
    ...(message.toolName ? { toolName: message.toolName } : {}),
  }));
}

/**
 * Treats a long first message as the job description.
 *
 * Users typically open a chat by pasting a job posting, and pinning it to the
 * session keeps it available on every AI turn even after it scrolls out of the
 * recent-history window.
 */
const JOB_DESCRIPTION_MIN_LENGTH = 400;

/**
 * Handles an incoming user message: saves it, runs the AI turn, saves the reply.
 *
 * @param chatId - Target chat session.
 * @param message - Raw user message text.
 * @returns The session and every message produced this turn, in order.
 */
export async function handleUserMessage(
  chatId: string,
  userId: string,
  message: string,
  files: IncomingFile[] = [],
  clientMessageId?: string,
): Promise<{ session: ChatSessionDocument; messages: ChatMessageDocument[] }> {
  const session = await getChatSession(chatId, userId);

  const uploadedFiles = files.length
    ? await processUploadedFiles(files, String(session._id))
    : [];

  const userMessage = await ChatMessageModel.create({
    chatSessionId: session._id,
    role: "user",
    content: message,
    ...(clientMessageId ? { clientMessageId } : {}),
    ...(uploadedFiles.length
      ? {
          attachments: uploadedFiles.map((file) => ({
            fileId: file._id,
            fileName: file.fileName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
          })),
        }
      : {}),
  });

  const messageCount = await ChatMessageModel.countDocuments({
    chatSessionId: session._id,
  });

  if (messageCount === 1) {
    session.title = deriveTitle(message);
    if (message.length >= JOB_DESCRIPTION_MIN_LENGTH) session.jobDescription = message;
  }

  // Pinned to the session so the resume stays available on every later turn,
  // even once this message falls outside the recent-history window.
  applyResumeContext(session, uploadedFiles);

  session.lastMessageAt = new Date();
  await session.save();

  const turnMessages = await runAiTurn(session);

  return { session, messages: [userMessage, ...turnMessages] };
}

/**
 * Runs one AI turn, executing any tools the model requests.
 *
 * A tool call produces three stored messages: the assistant's request, the
 * tool's result, and the assistant's final reply once it has seen that result.
 * All three are persisted because the provider requires that exact sequence
 * when history is replayed on later turns.
 *
 * @param session - Session whose history drives the turn.
 * @returns Every message created this turn, in order.
 */
async function runAiTurn(session: ChatSessionDocument): Promise<ChatMessageDocument[]> {
  const context = {
    jobDescription: session.jobDescription,
    resumeContext: session.resumeContext,
  };

  const history = await getRecentMessages(String(session._id));
  const reply = await aiService.sendMessage(
    toAiMessages(history),
    context,
    getToolDefinitions(),
  );

  if (!reply.toolCalls.length) {
    const assistantMessage = await ChatMessageModel.create({
      chatSessionId: session._id,
      role: "assistant",
      content: reply.content,
    });
    return [assistantMessage];
  }

  const created: ChatMessageDocument[] = [];

  created.push(
    await ChatMessageModel.create({
      chatSessionId: session._id,
      role: "assistant",
      content: reply.content,
      toolCalls: reply.toolCalls,
    }),
  );

  let documentUrl: string | null = null;

  for (const call of reply.toolCalls) {
    const result = await executeToolCall(call, String(session._id));
    if (typeof result.documentUrl === "string") documentUrl = result.documentUrl;

    created.push(
      await ChatMessageModel.create({
        chatSessionId: session._id,
        role: "tool",
        toolCallId: call.id,
        toolName: call.name,
        content: JSON.stringify(result),
      }),
    );
  }

  // Replay the turn — including the tool result — so the model can write a
  // closing message that references the document it just produced.
  const updatedHistory = await getRecentMessages(String(session._id));
  const finalReply = await aiService.sendMessage(
    toAiMessages(updatedHistory),
    context,
    getToolDefinitions(),
  );

  created.push(
    await ChatMessageModel.create({
      chatSessionId: session._id,
      role: "assistant",
      content: finalReply.content ?? "Your resume is ready.",
      documentUrl,
    }),
  );

  return created;
}

/** Events emitted while a streamed turn runs. */
export type ChatStreamEvent =
  | { type: "user-message"; message: ChatMessageDocument }
  | { type: "notice"; text: string }
  | { type: "delta"; text: string }
  | { type: "tool-start"; name: string }
  | { type: "message"; message: ChatMessageDocument }
  | { type: "title"; title: string }
  | { type: "error"; error: string };

/**
 * Names the session from its opening exchange, once.
 *
 * Runs only on the first turn, after the reply has been streamed, so the user
 * never waits on it. Yields nothing when the model declines or fails, leaving
 * the title derived from the user's own message in place.
 *
 * @param session - Session to name; saved only when a title is produced.
 * @param userMessage - The user's opening message.
 * @param assistantReply - The reply just streamed back.
 */
async function* titleFromFirstExchange(
  session: ChatSessionDocument,
  userMessage: string,
  assistantReply: string,
): AsyncGenerator<ChatStreamEvent> {
  const title = await generateChatTitle(userMessage, assistantReply);
  if (!title || title === session.title) return;

  session.title = title;
  await session.save();

  yield { type: "title", title };
}

/**
 * Handles a user message, streaming the assistant's reply as it is generated.
 *
 * Mirrors handleUserMessage but yields incremental events: the saved user
 * message first, then text deltas, then each persisted message. When the model
 * requests the PDF tool, a `tool-start` event lets the UI show progress during
 * the seconds that generation takes.
 *
 * @param chatId - Target chat session.
 * @param message - Raw user message text.
 * @param files - Optional attachments.
 */
export async function* streamUserMessage(
  chatId: string,
  userId: string,
  message: string,
  files: IncomingFile[] = [],
  clientMessageId?: string,
): AsyncGenerator<ChatStreamEvent> {
  const session = await getChatSession(chatId, userId);

  const uploadedFiles = files.length
    ? await processUploadedFiles(files, String(session._id))
    : [];

  const userMessage = await ChatMessageModel.create({
    chatSessionId: session._id,
    role: "user",
    content: message,
    ...(clientMessageId ? { clientMessageId } : {}),
    ...(uploadedFiles.length
      ? {
          attachments: uploadedFiles.map((file) => ({
            fileId: file._id,
            fileName: file.fileName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
          })),
        }
      : {}),
  });

  const messageCount = await ChatMessageModel.countDocuments({
    chatSessionId: session._id,
  });

  if (messageCount === 1) {
    session.title = deriveTitle(message);
    if (message.length >= JOB_DESCRIPTION_MIN_LENGTH) session.jobDescription = message;
  }

  applyResumeContext(session, uploadedFiles);

  session.lastMessageAt = new Date();
  await session.save();

  yield { type: "user-message", message: userMessage };

  const context = {
    jobDescription: session.jobDescription,
    resumeContext: session.resumeContext,
  };

  const history = await getRecentMessages(String(session._id));
  let reply: AiResponse = { content: null, toolCalls: [] };

  for await (const chunk of aiService.streamMessage(
    toAiMessages(history),
    context,
    getToolDefinitions(),
  )) {
    if (chunk.type === "delta") {
      yield { type: "delta", text: chunk.text };
    } else {
      reply = chunk.response;
    }
  }

  if (!reply.toolCalls.length) {
    yield {
      type: "message",
      message: await ChatMessageModel.create({
        chatSessionId: session._id,
        role: "assistant",
        content: reply.content,
      }),
    };

    if (messageCount === 1) {
      yield* titleFromFirstExchange(session, message, reply.content ?? "");
    }
    return;
  }

  yield {
    type: "message",
    message: await ChatMessageModel.create({
      chatSessionId: session._id,
      role: "assistant",
      content: reply.content,
      toolCalls: reply.toolCalls,
    }),
  };

  let documentUrl: string | null = null;

  for (const call of reply.toolCalls) {
    yield { type: "tool-start", name: call.name };

    const result = await executeToolCall(call, String(session._id));
    if (typeof result.documentUrl === "string") documentUrl = result.documentUrl;

    yield {
      type: "message",
      message: await ChatMessageModel.create({
        chatSessionId: session._id,
        role: "tool",
        toolCallId: call.id,
        toolName: call.name,
        content: JSON.stringify(result),
      }),
    };
  }

  const updatedHistory = await getRecentMessages(String(session._id));
  let finalReply: AiResponse = { content: null, toolCalls: [] };

  for await (const chunk of aiService.streamMessage(
    toAiMessages(updatedHistory),
    context,
    getToolDefinitions(),
  )) {
    if (chunk.type === "delta") {
      yield { type: "delta", text: chunk.text };
    } else {
      finalReply = chunk.response;
    }
  }

  const finalContent = finalReply.content ?? "Your resume is ready.";

  yield {
    type: "message",
    message: await ChatMessageModel.create({
      chatSessionId: session._id,
      role: "assistant",
      content: finalContent,
      documentUrl,
    }),
  };

  if (messageCount === 1) {
    yield* titleFromFirstExchange(session, message, finalContent);
  }
}

/**
 * Executes one tool call, converting failures into a result the model can read.
 *
 * A failed tool must not fail the request: the model needs to see the error so
 * it can explain the problem or retry with corrected input.
 */
async function executeToolCall(
  call: { id: string; name: string; arguments: Record<string, unknown> },
  chatSessionId: string,
): Promise<Record<string, unknown>> {
  try {
    const result = await executeTool(call.name, call.arguments, { chatSessionId });
    return result as Record<string, unknown>;
  } catch (error) {
    console.error(`Tool "${call.name}" failed:`, error);
    return {
      error: error instanceof Error ? error.message : "Tool execution failed",
    };
  }
}
