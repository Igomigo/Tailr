"use client";

import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { ChatSession } from "@/lib/types";

/**
 * Loads the chat sessions shown in the sidebar.
 *
 * `refresh` is called after a new conversation starts or is renamed, so the
 * list reflects the change without a full page load.
 */
export function useSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setSessions(await api.listSessions());
      setError(null);
    } catch (cause: unknown) {
      // Surfaced in the sidebar rather than swallowed, so an empty list is
      // never mistaken for having no conversations.
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load your conversations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { sessions, loading, error, refresh };
}
