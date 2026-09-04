"use client";

import { useCallback } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ChatSession } from "@/lib/types";

/**
 * Applies a change to one session in the cached list, leaving the rest alone.
 *
 * Every write goes through here rather than refetching the list, so only the
 * row that changed re-renders. Replacing the whole array would hand every row
 * a new object identity and re-render the entire sidebar, which reads as a
 * flicker even though nothing else changed.
 *
 * @param update - Returns the new session, or null to drop it from the list.
 */
function patchSession(
  client: QueryClient,
  chatId: string,
  update: (session: ChatSession) => ChatSession | null,
): void {
  client.setQueryData<ChatSession[]>(queryKeys.sessions, (sessions) =>
    sessions?.flatMap((session) => {
      if (session._id !== chatId) return [session];
      const next = update(session);
      return next ? [next] : [];
    }),
  );
}

/**
 * Loads the chat sessions shown in the sidebar, and the writes that change it.
 *
 * Each write updates the cache directly instead of refetching: the server
 * returns nothing the client does not already know, so a refetch would only
 * cost a request and disturb the list. Failures roll the cache back and
 * refetch, so the sidebar cannot be left showing a change that did not happen.
 */
export function useSessions() {
  const client = useQueryClient();

  const {
    data: sessions = [],
    isPending: loading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.sessions,
    queryFn: api.listSessions,
  });

  /** Puts a newly created session at the top, where the server would place it. */
  const addSession = useCallback(
    (session: ChatSession): void => {
      client.setQueryData<ChatSession[]>(queryKeys.sessions, (current) =>
        current ? [session, ...current] : [session],
      );
    },
    [client],
  );

  /**
   * Applies a title the assistant generated.
   *
   * Cache-only: the server saved it as part of the turn that produced it, so
   * writing it back would be a redundant round trip.
   */
  const setTitle = useCallback(
    (chatId: string, title: string): void => {
      patchSession(client, chatId, (session) => ({ ...session, title }));
    },
    [client],
  );

  const renameMutation = useMutation({
    mutationFn: ({ chatId, title }: { chatId: string; title: string }) =>
      api.renameSession(chatId, title),

    // The new title is already on screen in the input the user typed into, so
    // waiting for the server before showing it would look like a stall.
    onMutate: ({ chatId, title }) => {
      const previous = client.getQueryData<ChatSession[]>(queryKeys.sessions);
      patchSession(client, chatId, (session) => ({ ...session, title }));
      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) {
        client.setQueryData(queryKeys.sessions, context.previous);
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: (chatId: string) => api.deleteSession(chatId),

    onMutate: (chatId) => {
      const previous = client.getQueryData<ChatSession[]>(queryKeys.sessions);
      patchSession(client, chatId, () => null);
      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) {
        client.setQueryData(queryKeys.sessions, context.previous);
      }
    },

    // The conversation and its messages are gone; drop its cache entry so
    // reopening the id cannot show what was deleted.
    onSuccess: (_data, chatId) => {
      client.removeQueries({ queryKey: queryKeys.session(chatId) });
    },
  });

  const rename = useCallback(
    async (chatId: string, title: string): Promise<void> => {
      await renameMutation.mutateAsync({ chatId, title });
    },
    [renameMutation],
  );

  const remove = useCallback(
    async (chatId: string): Promise<void> => {
      await removeMutation.mutateAsync(chatId);
    },
    [removeMutation],
  );

  const error = queryError
    ? "Could not load your conversations."
    : renameMutation.error
      ? "Could not rename that conversation."
      : removeMutation.error
        ? "Could not delete that conversation."
        : null;

  return { sessions, loading, error, addSession, setTitle, rename, remove };
}
