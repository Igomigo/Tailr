"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as api from "@/lib/api";
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
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api
      .getCurrentUser()
      .then((current) => {
        if (!cancelled) setUser(current);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string): Promise<void> => {
      setUser(await api.signup(name, email, password));
    },
    [],
  );

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setUser(await api.login(email, password));
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    await api.logout();
    setUser(null);
  }, []);

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
