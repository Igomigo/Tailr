import type { ComponentPropsWithoutRef } from "react";

interface GlassSurfaceProps extends ComponentPropsWithoutRef<"div"> {
  variant?: "default" | "clear";
}

/** Shared glass material; callers own sizing, radius, and content. */
export function GlassSurface({
  className = "",
  children,
  variant = "default",
  ...props
}: GlassSurfaceProps) {
  return (
    <div
      {...props}
      className={`glass-surface ${variant === "clear" ? "glass-surface--clear" : ""} ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
