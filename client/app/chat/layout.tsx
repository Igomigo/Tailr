import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { ChatShell } from "@/components/chat/chat-shell";

/** Every chat route is private and shares one persistent chat screen. */
export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <ChatShell />
      {children}
    </RequireAuth>
  );
}
