import type { Request, Response } from "express";
import * as chatService from "./chat.service.js";
import {
  chatIdParamSchema,
  createChatSchema,
  sendMessageSchema,
} from "./chat.validation.js";

/** POST /chat — creates a new chat session. */
export async function createChat(req: Request, res: Response): Promise<void> {
  const { title } = createChatSchema.parse(req.body ?? {});
  const session = await chatService.createChatSession(title);
  res.status(201).json({ success: true, session });
}

/** GET /chat — lists chat sessions, most recently active first. */
export async function listChats(_req: Request, res: Response): Promise<void> {
  const sessions = await chatService.listChatSessions();
  res.json({ success: true, sessions });
}

/** GET /chat/:chatId — returns one session with its full message history. */
export async function getChat(req: Request, res: Response): Promise<void> {
  const { chatId } = chatIdParamSchema.parse(req.params);
  const { session, messages } = await chatService.getChatSessionWithMessages(chatId);
  res.json({ success: true, session, messages });
}

/**
 * POST /chat/:chatId/message — sends a user message, with optional attachments.
 *
 * Accepts JSON or multipart. A message may be empty when files are attached,
 * since uploading a resume with no comment is a reasonable thing to do.
 */
export async function sendMessage(req: Request, res: Response): Promise<void> {
  const { chatId } = chatIdParamSchema.parse(req.params);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const { message } = sendMessageSchema(files.length > 0).parse(req.body ?? {});

  const { messages } = await chatService.handleUserMessage(chatId, message, files);
  res.status(201).json({ success: true, messages });
}

/**
 * POST /chat/:chatId/message/stream — sends a message and streams the reply.
 *
 * Responds with Server-Sent Events so the client can render text as it is
 * generated. Errors after the stream has opened are delivered as an `error`
 * event rather than a status code, since headers are already sent.
 */
export async function streamMessage(req: Request, res: Response): Promise<void> {
  const { chatId } = chatIdParamSchema.parse(req.params);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const { message } = sendMessageSchema(files.length > 0).parse(req.body ?? {});

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Disables proxy buffering, which would otherwise defeat streaming.
    "X-Accel-Buffering": "no",
  });

  const send = (event: unknown): void => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    for await (const event of chatService.streamUserMessage(chatId, message, files)) {
      send(event);
    }
  } catch (error) {
    send({
      type: "error",
      error: error instanceof Error ? error.message : "Something went wrong",
    });
  } finally {
    send({ type: "end" });
    res.end();
  }
}
