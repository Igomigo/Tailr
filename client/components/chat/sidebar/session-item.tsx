"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Menu, MenuItem } from "@/components/ui/menu";
import { transition } from "@/lib/motion";

interface SessionItemProps {
  id: string;
  title: string;
  active: boolean;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => void;
  /**
   * Called when the conversation itself is opened, so the mobile drawer can
   * close behind it. Deliberately not on a wrapper: a handler covering the
   * whole row would also fire for the options button inside it.
   */
  onNavigate?: () => void;
}

/**
 * One conversation in the sidebar.
 *
 * Renaming happens in place rather than in a dialog: the title is already
 * visible here, so editing it where it sits is less disruptive than opening a
 * modal over the conversation.
 */
export function SessionItem({
  id,
  title,
  active,
  onRename,
  onDelete,
  onNavigate,
}: SessionItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = async (): Promise<void> => {
    const next = draft.trim();
    setEditing(false);

    if (!next || next === title) {
      setDraft(title);
      return;
    }

    await onRename(id, next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") void commit();
    if (event.key === "Escape") {
      setDraft(title);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <li>
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => void commit()}
          className="w-full rounded-[var(--radius-sm)] border border-white/20 bg-white/[0.06] px-3 py-2 text-small text-ink focus:border-white/35 focus:outline-none"
        />
      </li>
    );
  }

  return (
    <li className="group/item relative">
      <Link
        href={`/chat/${id}`}
        onClick={onNavigate}
        data-active={active}
        className="
          block truncate rounded-[var(--radius-sm)] py-2 pl-3 pr-11
          [@media(hover:hover)]:pr-9
          text-small text-ink-muted
          transition-colors duration-150
          hover:bg-white/[0.05] hover:text-ink
          data-[active=true]:bg-white/[0.07] data-[active=true]:text-ink
        "
      >
        {/*
          Keyed on the title so a rename swaps the element, letting the old and
          new text cross-fade. The assistant renames a conversation after its
          first reply, and text changing abruptly at the edge of vision pulls
          attention away from the reply the user is reading.
        */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition.base}
            title={title}
            className="block truncate text-white"
          >
            {title}
          </motion.span>
        </AnimatePresence>
      </Link>

      <button
        type="button"
        aria-label={`Options for ${title}`}
        onClick={(event) => {
          event.preventDefault();
          setMenuOpen(!menuOpen);
        }}
        data-open={menuOpen}
        className="
          absolute right-1 top-1/2 -translate-y-1/2 rounded-[6px] p-2.5
          text-ink-faint
          transition-[opacity,color,background-color] duration-150
          hover:bg-white/10 hover:text-ink
          focus-visible:opacity-100
          data-[open=true]:opacity-100
          [@media(hover:hover)]:p-1.5
          [@media(hover:hover)]:opacity-0
          [@media(hover:hover)]:group-hover/item:opacity-100
        "
      >
        <MoreHorizontal size={15} strokeWidth={2} />
      </button>

      <Menu open={menuOpen} onClose={() => setMenuOpen(false)}>
        <MenuItem
          icon={<Pencil size={14} strokeWidth={1.75} />}
          onClick={() => {
            setMenuOpen(false);
            setDraft(title);
            setEditing(true);
          }}
        >
          Rename
        </MenuItem>
        <MenuItem
          danger
          icon={<Trash2 size={14} strokeWidth={1.75} />}
          onClick={() => {
            setMenuOpen(false);
            onDelete(id);
          }}
        >
          Delete
        </MenuItem>
      </Menu>
    </li>
  );
}
