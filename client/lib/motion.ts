import type { Transition, Variants } from "motion/react";

/**
 * Shared motion language.
 *
 * One decelerating curve and a small set of durations, so every transition in
 * the product feels like it belongs to the same system. Nothing bounces or
 * overshoots: elements arrive and settle.
 */

/** Matches --ease-out-soft in globals.css. */
export const EASE_OUT_SOFT = [0.32, 0.72, 0, 1] as const;

export const DURATION = {
  /** Hovers and small state changes. */
  fast: 0.18,
  /** Most entrances and exits. */
  base: 0.32,
  /** Layout changes and the landing-to-chat transition. */
  slow: 0.52,
} as const;

export const transition = {
  fast: { duration: DURATION.fast, ease: EASE_OUT_SOFT },
  base: { duration: DURATION.base, ease: EASE_OUT_SOFT },
  slow: { duration: DURATION.slow, ease: EASE_OUT_SOFT },
} satisfies Record<string, Transition>;

/**
 * Spring used for shared-element movement, such as the composer travelling
 * from the centre of the landing page to the foot of the chat.
 */
export const SHARED_ELEMENT: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 32,
  mass: 0.9,
};

/** Rises into place while fading in. The default entrance. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: transition.base },
  exit: { opacity: 0, y: -8, transition: transition.fast },
};

/** Fades without movement, for elements that should not draw the eye. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.base },
  exit: { opacity: 0, transition: transition.fast },
};

/**
 * Reveals children one after another.
 *
 * @param stagger - Delay between children, in seconds.
 * @param delay - Delay before the first child, in seconds.
 */
export const stagger = (stagger = 0.06, delay = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});
