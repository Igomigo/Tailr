"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar/sidebar";
import { SidebarToggle } from "./sidebar/sidebar-toggle";
import { MessageList } from "./message-list";
import { EmptyState } from "./empty-state";
import { ErrorNotice } from "./error-notice";
import { Notice } from "./notice";
import { MessageInput } from "@/components/message-input";
import { Logo } from "@/components/logo";
import { useChat } from "@/hooks/use-chat";
import { useSessions } from "@/hooks/use-sessions";
import { useSidebar } from "@/hooks/use-sidebar";
import { transition } from "@/lib/motion";

/**
 * The chat screen.
 *
 * A conversation with no messages shows the input centred; sending the first
 * message moves it to the foot of the screen and reveals the transcript above.
 */
export function ChatView({ chatId }: { chatId?: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { collapsed, toggle } = useSidebar();
  const { sessions, error: sessionsError, refresh } = useSessions();

  const {
    messages,
    streamingText,
    status,
    error,
    notice,
    loading,
    send,
    retry,
  } = useChat({
    chatId,
    onSessionCreated: (id) => {
      // Replace rather than push, so Back returns to where the user came from
      // instead of an empty conversation they already left.
      router.replace(`/chat/${id}`);
      void refresh();
    },
  });

  const started = messages.length > 0;
  const busy = status !== "idle";

  /**
   * Which view to show. While an existing conversation loads, neither is
   * shown: rendering the empty state first would flash the new-chat screen
   * before the messages arrive.
   */
  const view = loading ? "loading" : started ? "conversation" : "empty";

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-canvas)]">
      <Sidebar
        sessions={sessions}
        activeId={chatId}
        error={sessionsError}
        collapsed={collapsed}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 px-3 sm:px-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="rounded-[var(--radius-sm)] p-2 text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-ink md:hidden"
          >
            <Menu size={19} strokeWidth={1.75} />
          </button>

          {/* Only reachable on desktop, where the rail is a permanent column. */}
          <div className="hidden md:block">
            <SidebarToggle collapsed={collapsed} onToggle={toggle} />
          </div>

          <div className="md:hidden">
            <Logo href="/chat" />
          </div>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {view === "conversation" && (
            <motion.div
              key="conversation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={transition.base}
              className="flex min-h-0 flex-1 flex-col"
            >
              <MessageList
                messages={messages}
                streamingText={streamingText}
                status={status}
              />

              <div className="shrink-0 px-5 pb-5 sm:px-6">
                <div className="mx-auto w-full max-w-[46rem]">
                  <MessageInput
                    onSubmit={send}
                    disabled={busy}
                    placeholder="Reply, or ask for a change…"
                  />
                  {notice && (
                    <div className="mt-3">
                      <Notice message={notice} />
                    </div>
                  )}
                  {error && (
                    <div className="mt-3">
                      <ErrorNotice message={error} onRetry={retry} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === "empty" && (
            <EmptyState
              key="empty"
              onSubmit={send}
              error={error}
              onRetry={retry}
            />
          )}

          {view === "loading" && <div key="loading" className="flex-1" />}
        </AnimatePresence>
      </main>
    </div>
  );
}
