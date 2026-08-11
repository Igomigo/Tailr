import { ChatView } from "@/components/chat/chat-view";

/** An existing conversation, loaded from its id in the URL. */
export default async function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  return <ChatView chatId={chatId} />;
}
