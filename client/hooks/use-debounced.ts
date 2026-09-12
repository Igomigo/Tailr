import { useEffect, useState } from "react";

/**
 * Follows a value, but only after it has stopped changing.
 *
 * Used to keep a request per keystroke from being sent while someone is still
 * typing. The delay is short enough that results feel like a response to
 * typing rather than to stopping.
 *
 * @param value - The value to follow.
 * @param delayMs - Quiet period before the value is adopted.
 */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
