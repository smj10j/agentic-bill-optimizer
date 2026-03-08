import React, { createContext, useContext, useState, useCallback } from "react";
import type { User, AuthTokens } from "@orbit/shared";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
};

type AuthContextValue = AuthState & {
  login: (tokens: AuthTokens, user: User) => void;
  logout: () => void;
  refresh: (tokens: AuthTokens) => void;
};

const AUTH_STORAGE_KEY = "orbit_auth";

function loadFromStorage(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null, user: null };
    return JSON.parse(raw) as AuthState;
  } catch {
    return { accessToken: null, refreshToken: null, user: null };
  }
}

function saveToStorage(state: AuthState): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

function clearStorage(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(loadFromStorage);

  const login = useCallback((tokens: AuthTokens, user: User) => {
    const next: AuthState = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
    setState(next);
    saveToStorage(next);
  }, []);

  const logout = useCallback(() => {
    const next: AuthState = { accessToken: null, refreshToken: null, user: null };
    setState(next);
    clearStorage();
  }, []);

  const refresh = useCallback((tokens: AuthTokens) => {
    setState((prev) => {
      const next: AuthState = {
        ...prev,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  const value: AuthContextValue = { ...state, login, logout, refresh };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
