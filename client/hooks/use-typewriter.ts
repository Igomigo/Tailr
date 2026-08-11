import { useEffect, useRef, useState } from "react";

/** Characters revealed per animation frame. */
const CHARS_PER_FRAME = 3;

/**
 * Reveals text at a steady reading pace.
 *
 * Providers deliver streamed text in uneven bursts: Gemini sends roughly 130
 * characters at a time, so rendering each chunk on arrival looks like text
 * jumping rather than being written. This buffers the incoming text and
 * releases it a few characters per frame, which reads as natural typing
 * regardless of how the provider batches.
 *
 * @param target - The full text received so far. Resetting it to an empty
 *   string clears the output immediately, which is how a completed message
 *   hands over to its persisted counterpart without briefly showing twice.
 * @returns The portion of the text currently visible.
 */
export function useTypewriter(target: string): string {
  const [visible, setVisible] = useState("");
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // Any frame queued for a previous target must not write over this one.
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    // Clearing the target ends the stream. Reset now rather than animating
    // down, so the finished message never overlaps the persisted one.
    if (!target) {
      setVisible("");
      return;
    }

    const step = (): void => {
      setVisible((current) => {
        // A target that no longer extends the visible text is a new message.
        const base = target.startsWith(current) ? current : "";
        if (base.length >= target.length) {
          frameRef.current = null;
          return target;
        }
        frameRef.current = requestAnimationFrame(step);
        return target.slice(0, base.length + CHARS_PER_FRAME);
      });
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [target]);

  return visible;
}
