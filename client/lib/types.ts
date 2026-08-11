/** Shapes returned by the Tailr API. */

export type MessageRole = "user" | "assistant" | "tool";

export interface ChatMessage {
  _id: string;
  chatSessionId: string;
  role: MessageRole;
  content: string | null;
  toolCalls?: { id: string; name: string }[];
  toolCallId?: string | null;
  documentUrl?: string | null;
  createdAt: string;
}

export interface ChatSession {
  _id: string;
  title: string;
  jobDescription: string | null;
  resumeContext: string | null;
  lastMessageAt: string;
  createdAt: string;
}

/** Events emitted by the streaming message endpoint. */
export type ChatStreamEvent =
  | { type: "user-message"; message: ChatMessage }
  | { type: "delta"; text: string }
  | { type: "tool-start"; name: string }
  | { type: "message"; message: ChatMessage }
  | { type: "error"; error: string }
  | { type: "end" };
