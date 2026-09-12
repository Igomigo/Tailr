"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { transition } from "@/lib/motion";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Announced to screen readers, and shown as a heading when `title` is set. */
  title?: string;
  description?: string;
  children: ReactNode;
  /** Widens the panel for content that needs the room, such as a document. */
  size?: "sm" | "md" | "wide" | "lg";
  /** Hides the close button for panels that supply their own. */
  showClose?: boolean;
  /** Removes panel padding and background, for full-bleed content like images. */
  bare?: boolean;
  /**
   * Where the panel sits vertically.
   *
   * "top" is for panels whose height changes with their content, such as a
   * list of search results: centred, they would drift up and down the screen
   * as the list grew and shrank.
   */
  align?: "center" | "top";
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  /** For a panel that lists things, where a narrow column wastes the screen. */
  wide: "max-w-3xl",
  lg: "max-w-[46rem]",
} as const;

/**
 * A modal dialog.
 *
 * Owns the behaviour every dialog needs: a blurred backdrop, close on Escape
 * or backdrop click, a locked page behind, and focus moved into the panel and
 * kept there while it is open. Content is passed as children so each use only
 * describes what is inside it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  showClose = true,
  bare = false,
  align = "center",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Held in a ref so the effect below can depend on `open` alone. Callers
  // routinely pass an inline arrow, which is a new function every render; with
  // `onClose` in the dependencies the effect tore down and re-ran on each one,
  // and its cleanup restores focus to whatever was focused before the dialog
  // opened. In a dialog that re-renders as you type — a search field — that
  // pulled focus out of the input after every character.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      // Keep Tab inside the dialog: focus escaping to the page behind is the
      // most common accessibility failure in a modal.
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Waits a frame so the panel exists before focus moves into it. A field
    // inside the panel is focused in preference to the panel itself: a dialog
    // built around an input should be ready to type into, and focusing the
    // wrapper would mean the first keystroke went nowhere.
    const frame = requestAnimationFrame(() => {
      const field = panelRef.current?.querySelector<HTMLElement>(
        "input:not([disabled]), textarea:not([disabled])",
      );
      (field ?? panelRef.current)?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      cancelAnimationFrame(frame);
      previouslyFocused?.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition.base}
          onClick={onClose}
          className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-canvas)]/80 backdrop-blur-2xl"
        >
          <div
            className={`
              flex min-h-full justify-center p-4 sm:p-8
              ${align === "top" ? "items-start pt-[12vh] sm:pt-[14vh]" : "items-center"}
            `}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: 6 }}
              transition={transition.base}
              onClick={(event) => event.stopPropagation()}
              className={`
                relative w-full ${SIZES[size]} focus:outline-none
                ${
                  bare
                    ? "overflow-hidden rounded-[var(--radius-md)]"
                    : "rounded-[var(--radius-lg)] border border-white/10 bg-[var(--color-overlay)] p-6 shadow-[0_32px_90px_-20px_rgba(0,0,0,0.8)]"
                }
              `}
            >
              {title && !bare && (
                <div className="mb-5">
                  <h2 className="text-title font-semibold text-ink">{title}</h2>
                  {description && (
                    <p className="mt-1 text-small text-ink-muted">
                      {description}
                    </p>
                  )}
                </div>
              )}

              {children}
            </motion.div>
          </div>

          {showClose && (
            /*
              Grey until pointed at, and without a border or shadow of its own.
              Dismissing is not the action the dialog is for, so the control is
              legible without competing with the content; hovering brightens
              the mark and fills the circle behind it, which is what tells you
              it is a button at all.
            */
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="
                fixed right-4 top-4 z-10 rounded-full p-2.5
                text-ink-muted
                transition-colors duration-150
                hover:bg-white/[0.09] hover:text-ink
                sm:right-6 sm:top-6
              "
            >
              <X size={18} strokeWidth={2} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
