"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { PenSquare, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { SessionItem } from "./session-item";
import { SessionListSkeleton } from "./session-list-skeleton";
import { ProfileButton } from "./profile-button";
import { transition } from "@/lib/motion";
import type { ChatSession } from "@/lib/types";

interface SidebarProps {
  sessions: ChatSession[];
  activeId?: string;
  /** Shows placeholder rows in place of the list while it is being fetched. */
  loading?: boolean;
  /** Shown in place of the list when sessions could not be loaded. */
  error?: string | null;
  onRename: (chatId: string, title: string) => Promise<void>;
  onDelete: (chatId: string) => void;
  /** Collapses the desktop rail. Has no effect on the mobile drawer. */
  collapsed: boolean;
  /** Controls the mobile drawer. */
  open: boolean;
  onClose: () => void;
}

const RAIL_WIDTH_PX = 256;

/** What both the desktop rail and the mobile drawer render inside them. */
type ContentProps = Omit<SidebarProps, "collapsed" | "open" | "onClose"> & {
  /** Closes the mobile drawer once a conversation has been opened. */
  onNavigate?: () => void;
};

/** Groups conversations under a heading once there are any. */
function SessionList({
  sessions,
  activeId,
  loading,
  error,
  onRename,
  onDelete,
  onNavigate,
}: ContentProps) {
  if (error) {
    return (
      <p className="px-3 py-2 text-micro text-[var(--color-danger)]">{error}</p>
    );
  }

  // Checked before the empty case: an empty list and an unfetched one look the
  // same from here, and showing "no conversations" to someone who has them is
  // worse than showing nothing at all.
  if (loading) return <SessionListSkeleton />;

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
            onRename={onRename}
            onDelete={onDelete}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </>
  );
}

/** Shared inner content, rendered in both the desktop rail and mobile drawer. */
function SidebarContent({ onNavigate, ...list }: ContentProps) {
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

      <nav className="mt-1 flex-1 overflow-y-auto">
        <SessionList {...list} onNavigate={onNavigate} />
      </nav>

      <div className="border-t border-[var(--color-line)] pt-2">
        <ProfileButton />
      </div>
    </div>
  );
}

/**
 * Conversation navigation.
 *
 * A fixed rail on desktop, and a drawer over the conversation on mobile where
 * the screen cannot afford a permanent column.
 */
export function Sidebar({
  collapsed,
  open,
  onClose,
  ...content
}: SidebarProps) {
  return (
    <>
      {/* Width is animated rather than toggled so the conversation reflows
          alongside the rail instead of snapping to its new size. */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 0 : RAIL_WIDTH_PX }}
        transition={transition.base}
        className="hidden shrink-0 overflow-hidden bg-surface md:block"
        style={{
          borderRight: collapsed ? "none" : "1px solid var(--color-line)",
        }}
      >
        <div style={{ width: RAIL_WIDTH_PX }} className="h-full">
          <SidebarContent {...content} />
        </div>
      </motion.aside>

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
              <SidebarContent {...content} onNavigate={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
