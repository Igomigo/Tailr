import type { CSSProperties } from "react";

interface SkeletonProps {
  /** Tailwind classes for the shape: width, height, and radius. */
  className?: string;
  /** For dimensions that are computed rather than fixed, such as a row width. */
  style?: CSSProperties;
}

/**
 * A placeholder standing in for content that has not arrived.
 *
 * Shape only — every skeleton in the product is built by composing these into
 * the outline of the thing being waited for, so a loading screen has the same
 * silhouette as the screen that replaces it and nothing jumps on arrival.
 *
 * Deliberately quiet: it sits at the same weight as a hairline, since a
 * placeholder that draws more attention than real content inverts the
 * hierarchy. The sweep animation lives in globals.css as `.skeleton`, where
 * the reduced-motion rule can reach it.
 */
export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      aria-hidden
      style={style}
      className={`skeleton rounded-[var(--radius-sm)] ${className}`}
    />
  );
}
