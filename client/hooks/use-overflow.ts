import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reports whether an element's content is wider than the space it has.
 *
 * Used to decide whether a title is worth scrolling on hover: one that already
 * fits should not move, since motion with nothing to reveal reads as noise.
 *
 * Re-measures when the element resizes — the sidebar is a fixed width, but the
 * mobile drawer is not, and a title that fits in one may not fit in the other.
 *
 * @returns A ref to attach to the element, the amount it overflows in pixels,
 *   and whether it overflows at all.
 */
export function useOverflow<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [overflow, setOverflow] = useState(0);

  const measure = useCallback((): void => {
    const element = ref.current;
    if (!element) return;

    // Sub-pixel differences are rounding, not real overflow, and would start a
    // scroll that travels a fraction of a pixel.
    const distance = element.scrollWidth - element.clientWidth;
    setOverflow(distance > 1 ? distance : 0);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, [measure]);

  return { ref, overflow, isOverflowing: overflow > 0, measure };
}
