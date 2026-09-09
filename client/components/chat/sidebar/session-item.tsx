"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Menu, MenuItem } from "@/components/ui/menu";
import { useOverflow } from "@/hooks/use-overflow";
import { transition } from "@/lib/motion";

/**
 * Pixels of title travelled per second while revealing.
 *
 * Reading pace, and expressed as a speed rather than a duration so every title
 * moves alike: a fixed duration would crawl through a title one word too long
 * and race through a very long one.
 */
const REVEAL_SPEED_PX_PER_SECOND = 26;

/**
 * Pause before the title starts moving, in seconds.
 *
 * Rows are passed over on the way elsewhere, and text that leaps the instant
 * the pointer touches it makes the whole list feel twitchy. Long enough to
 * mean the pointer stopped here on purpose.
 */
const REVEAL_DELAY_SECONDS = 0.55;

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
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    ref: titleRef,
    overflow,
    isOverflowing: clipped,
  } = useOverflow<HTMLSpanElement>();

  // Only while there is something to reveal. Scrolling a title that already
  // fits would move it for no reason, and scrolling under an open menu would
  // pull the eye away from the choice being made.
  const revealing = hovered && clipped && !menuOpen;

  // Travel time only; the pause at each end is the animation's delay.
  const duration = overflow / REVEAL_SPEED_PX_PER_SECOND;

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
    <li
      className="group/item relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        href={`/chat/${id}`}
        onClick={onNavigate}
        data-active={active}
        className="
          block overflow-hidden rounded-[var(--radius-sm)] px-3 py-2
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
            // Faded only while there is something past the edge to reveal, so
            // a title that fits keeps its last characters at full strength.
            className={`block ${clipped ? "title-fade" : ""}`}
          >
            {/*
              The measured element is the inline text, not the row: its width is
              the width of the title, which is what the row's width is compared
              against to decide whether any of it is hidden.
            */}
            <span
              ref={titleRef}
              // Native tooltip only when the title is both clipped and not
              // being revealed some other way, so hovering does not produce a
              // tooltip competing with the text it is already showing.
              title={clipped ? title : undefined}
              style={
                {
                  "--scroll-distance": `${overflow}px`,
                  "--scroll-duration": `${duration}s`,
                  "--scroll-delay": `${REVEAL_DELAY_SECONDS}s`,
                } as CSSProperties
              }
              className={`
                block w-max max-w-full truncate whitespace-nowrap text-white
                ${revealing ? "title-scroll max-w-none" : ""}
              `}
            >
              {title}
            </span>
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
          text-ink
          transition-opacity duration-150
          focus-visible:opacity-100
          data-[open=true]:opacity-100
          [@media(hover:hover)]:p-1.5
          [@media(hover:hover)]:opacity-0
          [@media(hover:hover)]:group-hover/item:opacity-100
        "
      >
        {/*
          Floats above the title rather than reserving space beside it, so the
          full width of the row is the title's to use. The glyph alone, with no
          chip behind it: a background here would sit over moving text and read
          as a second surface inside a row that is already one.
        */}
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
