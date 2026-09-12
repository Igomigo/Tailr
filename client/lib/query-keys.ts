/**
 * Every cache key used by the app, in one place.
 *
 * Keys are built here rather than written inline so that a query and the
 * mutation that invalidates it cannot drift apart: a typo in an inline key
 * fails silently, leaving stale data on screen with nothing to debug.
 */
export const queryKeys = {
  /** The signed-in user, or null when signed out. */
  currentUser: ["current-user"] as const,

  /** The sidebar's conversation list. */
  sessions: ["session-list"] as const,

  /**
   * One conversation with its messages.
   *
   * Deliberately not nested under the list's key. React Query matches keys by
   * prefix, so while this was ["sessions", chatId] every write aimed at the
   * list — a rename, a delete, the clear on sign-out — also matched each
   * conversation's history and dropped it. The chat then rendered as if it had
   * no messages, which is the empty new-chat screen.
   */
  session: (chatId: string) => ["session", chatId] as const,

  /** Search results for one query. */
  sessionSearch: (query: string) => ["session-search", query] as const,
} as const;
