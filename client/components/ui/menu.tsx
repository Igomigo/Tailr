"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

interface MenuProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Aligns the panel to the trigger's left or right edge. */
  align?: "left" | "right";
}

/**
 * A small popover anchored to its trigger.
 *
 * Closes on Escape, on a click elsewhere, and on scroll, since a panel
 * anchored to a row would otherwise drift away from it.
 */
export function Menu({ open, onClose, children, align = "right" }: MenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Scoped to the whole anchor, which holds the trigger as well as the panel,
    // so a press on the trigger is not treated as a press outside. That leaves
    // the trigger free to toggle its own state without this handler racing it.
    const anchor = panelRef.current?.parentElement;

    const onPointerDown = (event: PointerEvent): void => {
      if (!anchor?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };

    // pointerdown covers mouse, touch, and pen alike; mousedown is synthesised
    // late on touch, after the tap that opened the menu had already run.
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role="menu"
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -2 }}
          transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
          style={{
            transformOrigin: align === "right" ? "top right" : "top left",
          }}
          className={`
            absolute top-full z-50 mt-1 min-w-40
            overflow-hidden rounded-[var(--radius-md)]
            border border-white/10 bg-[var(--color-overlay)]
            p-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]
            ${align === "right" ? "right-0" : "left-0"}
          `}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface MenuItemProps {
  onClick: () => void;
  children: ReactNode;
  icon?: ReactNode;
  /** Marks a destructive action, such as deleting. */
  danger?: boolean;
}

/** One action inside a Menu. */
export function MenuItem({
  onClick,
  children,
  icon,
  danger = false,
}: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`
        flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2
        text-left text-small transition-colors duration-150
        ${
          danger
            ? "text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
            : "text-ink-muted hover:bg-white/[0.07] hover:text-ink"
        }
      `}
    >
      {icon}
      {children}
    </button>
  );
}
