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

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setSessions(await api.listSessions());
    } catch {
      // The sidebar is not worth interrupting the conversation for.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { sessions, loading, refresh };
}
