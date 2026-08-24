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

  /**
   * Renames a session, updating the list before the request completes.
   *
   * The new title is already on screen in the input the user just typed into,
   * so waiting for the server before showing it would look like a stall.
   */
  const rename = useCallback(
    async (chatId: string, title: string): Promise<void> => {
      const previous = sessions;
      setSessions((current) =>
        current.map((session) =>
          session._id === chatId ? { ...session, title } : session,
        ),
      );

      try {
        await api.renameSession(chatId, title);
      } catch {
        setSessions(previous);
        setError("Could not rename that conversation.");
      }
    },
    [sessions],
  );

  /** Removes a session, updating the list before the request completes. */
  const remove = useCallback(
    async (chatId: string): Promise<void> => {
      const previous = sessions;
      setSessions((current) =>
        current.filter((session) => session._id !== chatId),
      );

      try {
        await api.deleteSession(chatId);
      } catch {
        setSessions(previous);
        setError("Could not delete that conversation.");
      }
    },
    [sessions],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { sessions, loading, error, refresh, rename, remove };
}
