"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tailr:sidebar-collapsed";

/**
 * Remembers whether the desktop sidebar is collapsed.
 *
 * The stored value is read after mount rather than during render, because
 * localStorage is not available on the server and reading it during render
 * would produce a hydration mismatch.
 */
export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  const toggle = useCallback((): void => {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
