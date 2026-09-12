"use client";

import { useParams } from "next/navigation";
import { ChatView } from "./chat-view";

/**
 * Owns the chat screen for every /chat route.
 *
 * It sits in the shared route layout, which Next keeps mounted while the URL
 * changes between /chat and /chat/:chatId. That lets a newly created session
 * claim its permanent URL immediately without interrupting its first stream.
 */
export function ChatShell() {
  const { chatId } = useParams<{ chatId?: string }>();

  return <ChatView chatId={chatId} />;
}
