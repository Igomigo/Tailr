"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";

/**
 * Supplies the React Query cache to the app.
 *
 * The client is created in state rather than at module scope so each browser
 * session gets its own cache. A module-level client would be shared across
 * requests during server rendering, leaking one user's data into another's.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Conversations only change through this app, so refetching on
            // every window focus costs requests without showing anything new.
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            // A 4xx means the request itself was refused, so retrying cannot
            // fix it and each attempt delays telling the user what happened.
            // Network and 5xx failures are worth a second try.
            retry: (failureCount, error) =>
              error instanceof ApiError && error.status < 500
                ? false
                : failureCount < 2,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
