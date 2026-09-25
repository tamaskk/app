// Holds the single AuthService instance + reactive user state, mirroring how
// apps/mobile/lib/main.dart's AuthGate owns an AuthService and threads it down.
import React, { createContext, useContext, useMemo, useRef, useState, useCallback } from "react";
import { AuthService } from "../lib/authService";
import { AuthUser } from "../models/auth";

interface AuthContextValue {
  auth: AuthService;
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authRef = useRef<AuthService>(new AuthService());
  const [user, setUser] = useState<AuthUser | null>(null);

  const logout = useCallback(async () => {
    await authRef.current.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ auth: authRef.current, user, setUser, logout }),
    [user, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
