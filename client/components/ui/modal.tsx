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
  size?: "sm" | "md" | "lg";
  /** Hides the close button for panels that supply their own. */
  showClose?: boolean;
  /** Removes panel padding and background, for full-bleed content like images. */
  bare?: boolean;
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
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
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
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

    // Waits a frame so the panel exists before focus moves into it.
    const frame = requestAnimationFrame(() => panelRef.current?.focus());

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      cancelAnimationFrame(frame);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

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
          <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
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
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="
                fixed right-4 top-4 z-10 rounded-full
                border border-white/15 bg-[var(--color-overlay)]
                p-2.5 text-ink shadow-lg
                transition-colors duration-150 hover:bg-white/[0.14]
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
