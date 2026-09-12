"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar/sidebar";
import { SidebarToggle } from "./sidebar/sidebar-toggle";
import { SearchModal } from "./sidebar/search-modal";
import { MessageList } from "./message-list";
import { MessageListSkeleton } from "./message-list-skeleton";
import { EmptyState } from "./empty-state";
import { ErrorNotice } from "./error-notice";
import { Notice } from "./notice";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
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
  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    addSession,
    rename,
    remove,
    setTitle,
  } = useSessions();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd/Ctrl-K opens search from anywhere on the screen, which is where every
  // other app of this shape puts it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const {
    messages,
    streamingText,
    status,
    error,
    notice,
    loading,
    loadFailed,
    reload,
    send,
    retry,
  } = useChat({
    chatId,
    onSessionCreated: (session) => {
      // Added straight to the cached list rather than refetching it: the server
      // would return the same sessions plus this one, and replacing the list
      // re-renders every row that did not change.
      addSession(session);
      // Replace rather than push, so Back returns to where the user came from
      // instead of an empty conversation they already left.
      router.replace(`/chat/${session._id}`);
    },
    onTitle: setTitle,
  });

  const started = messages.length > 0;
  const busy = status !== "idle";

  /**
   * Which view to show. While an existing conversation loads, neither is
   * shown: rendering the empty state first would flash the new-chat screen
   * before the messages arrive.
   *
   * A conversation that failed to load is called out rather than falling
   * through to "empty", which would silently show the new-chat screen at a URL
   * that names a real conversation and read as an unexplained redirect.
   */
  const view = loading
    ? "loading"
    : loadFailed
      ? "failed"
      : started
        ? "conversation"
        : "empty";

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-canvas)]">
      <Sidebar
        sessions={sessions}
        activeId={chatId}
        loading={sessionsLoading}
        error={sessionsError}
        onRename={rename}
        onDelete={setPendingDelete}
        onSearch={() => setSearchOpen(true)}
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

          {view === "failed" && (
            <motion.div
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={transition.base}
              className="flex flex-1 items-center justify-center px-5"
            >
              <div className="w-full max-w-[26rem]">
                <ErrorNotice
                  message="Could not load this conversation."
                  onRetry={() => void reload()}
                />
              </div>
            </motion.div>
          )}

          {view === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition.base}
              className="flex min-h-0 flex-1 flex-col"
            >
              <MessageListSkeleton />

              {/* The composer needs no data, so it is real rather than a
                  placeholder. Holding its place also means the transcript does
                  not resize under it when the messages arrive. */}
              <div className="shrink-0 px-5 pb-5 sm:px-6">
                <div className="mx-auto w-full max-w-[46rem]">
                  <MessageInput
                    onSubmit={send}
                    disabled
                    placeholder="Reply, or ask for a change…"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        sessions={sessions}
      />

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete this conversation?"
        description="The messages and any resumes generated in it will be removed. This cannot be undone."
        size="sm"
        showClose={false}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const id = pendingDelete!;
              setPendingDelete(null);
              void remove(id);
              // Leave a conversation that no longer exists.
              if (id === chatId) router.push("/chat");
            }}
            className="bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/85"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
