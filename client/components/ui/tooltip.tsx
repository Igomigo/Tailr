import type { ReactNode } from "react";
import { GlassSurface } from "./glass-surface";

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: "bottom" | "left";
}

/** Fast, reusable tooltip for compact controls that only show an icon. */
export function Tooltip({ label, children, side = "bottom" }: TooltipProps) {
  const position = side === "left"
    ? "right-[calc(100%+0.5rem)] top-1/2 -translate-y-1/2"
    : "right-0 top-[calc(100%+0.5rem)]";

  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap opacity-0 transition-opacity duration-100 group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100 ${position}`}
      >
        <GlassSurface
          variant="clear"
          className="rounded-[var(--radius-sm)] px-2.5 py-1.5 text-micro text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
        >
          {label}
        </GlassSurface>
      </span>
    </span>
  );
}
