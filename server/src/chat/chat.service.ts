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
import type { AiMessage } from "../ai/ai-provider.interface.js";
import { getToolDefinitions, executeTool } from "../ai/tools/ai-tools.service.js";
import {
  processUploadedFiles,
  combineParsedText,
  type IncomingFile,
} from "../files/uploaded-file.service.js";

/** How many recent messages are replayed as AI context. */
const HISTORY_LIMIT = 20;

/** Characters of the first user message used to auto-title an untitled chat. */
const TITLE_LENGTH = 60;

/**
 * Creates a new chat session.
 *
 * @param title - Optional title; a placeholder is used until the first message
 *   arrives, at which point the session is retitled from that message.
 */
export async function createChatSession(
  title?: string,
): Promise<ChatSessionDocument> {
  return ChatSessionModel.create({ title: title ?? "New chat" });
}

/** Lists chat sessions, most recently active first. */
export async function listChatSessions(): Promise<ChatSessionDocument[]> {
  return ChatSessionModel.find().sort({ lastMessageAt: -1 }).limit(50);
}

/**
 * Loads a chat session by id.
 *
 * @throws AppError 404 when no session matches.
 */
export async function getChatSession(
  chatId: string,
): Promise<ChatSessionDocument> {
  const session = await ChatSessionModel.findById(chatId);
  if (!session) throw notFound("Chat session not found");
  return session;
}

/** Loads a session together with its messages in chronological order. */
export async function getChatSessionWithMessages(chatId: string): Promise<{
  session: ChatSessionDocument;
  messages: ChatMessageDocument[];
}> {
  const session = await getChatSession(chatId);
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
  message: string,
  files: IncomingFile[] = [],
): Promise<{ session: ChatSessionDocument; messages: ChatMessageDocument[] }> {
  const session = await getChatSession(chatId);

  const uploadedFiles = files.length
    ? await processUploadedFiles(files, String(session._id))
    : [];

  const userMessage = await ChatMessageModel.create({
    chatSessionId: session._id,
    role: "user",
    content: message,
    ...(uploadedFiles.length
      ? { attachments: uploadedFiles.map((file) => file._id) }
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
  const parsedText = combineParsedText(uploadedFiles);
  if (parsedText) session.resumeContext = parsedText;

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
