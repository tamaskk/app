"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as api from "./api";
import { LangProvider } from "./i18n";
import type { AuthUser } from "./types";

// Mirrors the mobile AuthGate + AuthService: a session is restored on launch,
// and login/register/logout mutate the in-memory user. The bearer token lives
// in localStorage (see api.ts).

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: {
    email: string;
    password: string;
    name?: string;
    onboarding?: unknown;
  }) => Promise<AuthUser>;
  logout: () => void;
  setUser: (u: AuthUser | null) => void;
  saveOnboarding: (data: unknown) => Promise<AuthUser>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthStateProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.restoreSession().then((u) => {
      if (alive) {
        setUser(u);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await api.login(email, password);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      name?: string;
      onboarding?: unknown;
    }) => {
      const u = await api.register(input);
      setUser(u);
      return u;
    },
    [],
  );

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  const saveOnboarding = useCallback(async (data: unknown) => {
    const u = await api.saveOnboarding(data);
    setUser(u);
    return u;
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    login,
    register,
    logout,
    setUser,
    saveOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Top-level provider: language + auth, in that nesting order. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <AuthStateProvider>{children}</AuthStateProvider>
    </LangProvider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
