"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { PenSquare, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { SessionItem } from "./session-item";
import { transition } from "@/lib/motion";
import type { ChatSession } from "@/lib/types";

interface SidebarProps {
  sessions: ChatSession[];
  activeId?: string;
  /** Controls the mobile drawer; the desktop rail is always visible. */
  open: boolean;
  onClose: () => void;
}

/** Groups conversations under a heading once there are any. */
function SessionList({
  sessions,
  activeId,
}: {
  sessions: ChatSession[];
  activeId?: string;
}) {
  if (!sessions.length) {
    return (
      <p className="px-3 py-2 text-micro text-ink-faint">
        Your conversations will appear here.
      </p>
    );
  }

  return (
    <>
      <p className="px-3 pb-1.5 pt-4 text-micro uppercase tracking-[0.12em] text-ink-faint">
        Recent
      </p>
      <ul className="flex flex-col gap-0.5">
        {sessions.map((session) => (
          <SessionItem
            key={session._id}
            id={session._id}
            title={session.title}
            active={session._id === activeId}
          />
        ))}
      </ul>
    </>
  );
}

/** Shared inner content, rendered in both the desktop rail and mobile drawer. */
function SidebarContent({
  sessions,
  activeId,
  onNavigate,
}: {
  sessions: ChatSession[];
  activeId?: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col px-3 py-4">
      <div className="px-2 pb-4">
        <Logo href="/chat" />
      </div>

      <Link
        href="/chat"
        onClick={onNavigate}
        className="
          flex items-center gap-2.5 rounded-[var(--radius-sm)]
          border border-white/10 px-3 py-2.5
          text-small text-ink
          transition-colors duration-150
          hover:border-white/20 hover:bg-white/[0.05]
        "
      >
        <PenSquare size={15} strokeWidth={1.75} />
        New resume
      </Link>

      <nav className="mt-1 flex-1 overflow-y-auto" onClick={onNavigate}>
        <SessionList sessions={sessions} activeId={activeId} />
      </nav>
    </div>
  );
}

/**
 * Conversation navigation.
 *
 * A fixed rail on desktop, and a drawer over the conversation on mobile where
 * the screen cannot afford a permanent column.
 */
export function Sidebar({ sessions, activeId, open, onClose }: SidebarProps) {
  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-[var(--color-line)] bg-[var(--color-surface)] md:block">
        <SidebarContent sessions={sessions} activeId={activeId} />
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition.fast}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={transition.base}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-[var(--color-line)] bg-[var(--color-surface)] md:hidden"
            >
              <button
                type="button"
                aria-label="Close menu"
                onClick={onClose}
                className="absolute right-3 top-4 rounded-full p-1.5 text-ink-faint transition-colors hover:bg-white/[0.07] hover:text-ink"
              >
                <X size={17} strokeWidth={1.75} />
              </button>
              <SidebarContent
                sessions={sessions}
                activeId={activeId}
                onNavigate={onClose}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
