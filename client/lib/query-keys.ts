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
  sessions: ["sessions"] as const,

  /** One conversation with its messages. */
  session: (chatId: string) => ["sessions", chatId] as const,
} as const;
