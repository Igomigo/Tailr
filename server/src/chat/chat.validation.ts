import { z } from "zod";

/** Rejects path params that are not valid Mongo ObjectIds before any query runs. */
export const chatIdParamSchema = z.object({
  chatId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid chat id"),
});

export const renameChatSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(200),
});

export const createChatSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

/** Validates a search query. Capped because it is compiled into a regex. */
export const searchChatsSchema = z.object({
  q: z.string().trim().min(1, "Enter something to search for").max(100),
});

/**
 * Validates a chat message.
 *
 * @param hasFiles - When true the message may be empty, since uploading a
 *   resume without any accompanying comment is valid.
 */
export const sendMessageSchema = (hasFiles = false) =>
  z.object({
    message: hasFiles
      ? z.string().trim().max(20_000).optional().default("")
      : z.string().trim().min(1, "Message cannot be empty").max(20_000),
    clientMessageId: z.string().uuid().optional(),
  });

export type CreateChatInput = z.infer<typeof createChatSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
