"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AuthUser } from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the initial session check resolves. */
  loading: boolean;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Holds the signed-in user for the app.
 *
 * The session itself is a token held by the API layer, which attaches it to
 * every request; this only mirrors who that token belongs to, so the UI can
 * render a name and know whether to redirect.
 *
 * Kept as a context rather than calling the query directly in each component
 * so that `loading` means "the first check has not finished" everywhere, which
 * is what a redirect guard needs in order not to bounce a signed-in user out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();

  const { data: user = null, isPending: loading } = useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: api.getCurrentUser,
    // The signed-in user rarely changes within a visit, and every screen reads
    // it, so refetching on mount would repeat a request for an unchanged value.
    staleTime: Infinity,
  });

  const signupMutation = useMutation({
    mutationFn: ({
      name,
      email,
      password,
    }: {
      name: string;
      email: string;
      password: string;
    }) => api.signup(name, email, password),
    onSuccess: (created) => client.setQueryData(queryKeys.currentUser, created),
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onSuccess: (signedIn) => client.setQueryData(queryKeys.currentUser, signedIn),
  });

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    // Cleared even when the request fails: the API layer discards the token
    // regardless, so the user is signed out whatever the server replied.
    onSettled: () => {
      client.setQueryData(queryKeys.currentUser, null);
      // Everything else in the cache belongs to the account just signed out.
      client.removeQueries({ queryKey: queryKeys.sessions });
    },
  });

  const signup = useCallback(
    async (name: string, email: string, password: string): Promise<void> => {
      await signupMutation.mutateAsync({ name, email, password });
    },
    [signupMutation],
  );

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      await loginMutation.mutateAsync({ email, password });
    },
    [loginMutation],
  );

  const logout = useCallback(async (): Promise<void> => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Reads the auth context. Must be used inside AuthProvider. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
