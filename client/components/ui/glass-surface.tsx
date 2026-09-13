import type { ComponentPropsWithoutRef } from "react";

/** Shared glass material; callers own sizing, radius, and content. */
export function GlassSurface({ className = "", children, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={`glass-surface ${className}`}>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
