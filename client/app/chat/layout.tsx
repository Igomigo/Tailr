import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/require-auth";

/** Every chat route is private. */
export default function ChatLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
