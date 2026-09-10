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
import { transition } from "@/lib/motion";

/**
 * Clear space left between the end of a revealed title and the cover, in
 * pixels.
 *
 * The title scrolls so its last character stops short of the cover entirely,
 * rather than up against it. A word ending exactly at an edge still reads as
 * though it might continue; a gap is what makes it obvious the title is
 * finished and nothing is being withheld.
 */
const REVEAL_GAP_PX = 2;

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

  // How far the title runs past the row: the text's natural width against the
  // width available to it. Two elements are involved because neither number
  // can come from one of them — the text is truncated, so it never reports
  // overflow of its own, and the container is only ever as wide as the row.
  const clipRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const coverRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  // Measured on hover rather than watched continuously. The widths are only
  // needed at the moment the reveal starts, and by then the row is laid out.
  const handleEnter = (): void => {
    const clip = clipRef.current;
    const text = textRef.current;
    const cover = coverRef.current;

    if (clip && text && cover) {
      // The end of the title has to come to rest clear of the cover, not
      // merely reach the edge of the row: stopping at the edge leaves the last
      // words behind the button, which is the part worth scrolling to read.
      //
      // Measured to where the cover begins — its left edge, not the point it
      // turns opaque — and then pulled back further by a gap, so the last
      // character finishes in open space rather than against the fade. Taken
      // from the cover's own box, so the travel stays right if the button or
      // its padding ever changes.
      const clipBox = clip.getBoundingClientRect();
      const coverBox = cover.getBoundingClientRect();
      const usable = coverBox.left - clipBox.left - REVEAL_GAP_PX;

      // Nothing to reveal unless the row is actually clipping the title. The
      // gap makes the resting place narrower than the row, so without this a
      // title that fits perfectly well would still shuffle sideways to sit
      // inside the gap — motion with nothing to show.
      const hidden = text.scrollWidth > clip.clientWidth;

      setOverflow(hidden ? Math.max(0, text.scrollWidth - usable) : 0);
    }

    setHovered(true);
  };

  // Only while there is something to reveal. Scrolling a title that already
  // fits would move it for no reason, and scrolling under an open menu would
  // pull the eye away from the choice being made.
  const revealing = hovered && overflow > 0 && !menuOpen;

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
      // Inset by a hair so the field's border and the ring around it are not
      // clipped by the scrolling column, whose edges the rows otherwise meet
      // exactly. A border cut off along one side reads as a broken element
      // rather than a field waiting for input.
      <li className="px-1 py-0.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => void commit()}
          // The ring is drawn as a shadow rather than an outline: an outline
          // sits outside the element's box and would be clipped again, while a
          // shadow is painted within the space reserved above.
          //
          // No horizontal padding of its own: the row's inset and this field's
          // border already sit the text within a pixel of where the title was,
          // and padding here would push it further right than the text it
          // replaces.
          className="
            w-full rounded-[var(--radius-sm)]
            border border-white/25 bg-white/[0.06]
            px-0 py-2 text-small text-ink
            outline-none
            transition-[border-color,box-shadow] duration-150
            focus:border-white/40
            focus:shadow-[0_0_0_3px_rgba(255,255,255,0.07)]
          "
        />
      </li>
    );
  }

  return (
    <li
      className="group/item relative"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        href={`/chat/${id}`}
        onClick={onNavigate}
        data-active={active}
        className="
          block overflow-hidden rounded-[var(--radius-sm)] px-1 py-2
          text-small text-ink-muted
          transition-colors duration-150
          hover:bg-white/[0.08] hover:text-ink
          data-[active=true]:bg-white/[0.11] data-[active=true]:text-ink
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
            className="block"
          >
            {/*
              Two elements on purpose. This one clips and stays put, so it can
              be measured; the one inside it is free to be wider than the row
              and is what slides. Measuring and moving the same element makes
              the distance collapse to zero the moment it starts moving.
            */}
            <span
              ref={clipRef}
              className="block overflow-hidden whitespace-nowrap"
            >
              {/*
                No `title` attribute: the browser's tooltip would appear over
                the row a moment after hovering, saying the same thing the
                title is at that point scrolling to show, and covering the row
                below while it did.
              */}
              <span
                ref={textRef}
                style={
                  { "--scroll-distance": `${overflow}px` } as CSSProperties
                }
                className={`
                  inline-block max-w-full truncate align-bottom text-white
                  ${revealing ? "title-scroll max-w-none" : ""}
                `}
              >
                {title}
              </span>
            </span>
          </motion.span>
        </AnimatePresence>
      </Link>

      {/*
        Sits between the title and the button, matching whatever the row is
        currently painted, so a title scrolling past appears to slide behind an
        edge. Its colour is composited here rather than left translucent: a
        see-through cover would show the very text it exists to hide.

        Shown whenever the button is, not only while a title is moving. A title
        can reach the button without being long enough to be worth scrolling,
        and the dots then sit directly on the text; giving every hovered row the
        same ground under them also means the button always looks the same
        rather than changing with the length of the title beside it.
      */}
      <span
        ref={coverRef}
        aria-hidden
        data-visible={hovered || menuOpen}
        style={
          {
            // Composited against the rail, which the rows sit on. Mixed to
            // whichever of the row's own tints is showing — the active row is
            // lighter than a merely hovered one — so the cover disappears into
            // the row instead of reading as a patch laid over it.
            "--cover-color": active
              ? "color-mix(in srgb, #fff 11%, var(--color-rail))"
              : "color-mix(in srgb, #fff 8%, var(--color-rail))",
          } as CSSProperties
        }
        className="
          title-cover
          pointer-events-none absolute right-0 top-1/2 h-8 w-16 -translate-y-1/2
          rounded-r-[var(--radius-sm)]
          transition-opacity duration-150
          data-[visible=true]:opacity-100
          [@media(hover:hover)]:opacity-0
        "
      />

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
