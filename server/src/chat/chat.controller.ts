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
