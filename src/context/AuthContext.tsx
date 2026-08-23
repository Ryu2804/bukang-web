import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { request, setOnUnauthorized } from "../services/api";
import { isTokenExpired, getTokenExpiryMs, clearAuthStorage } from "../utils/jwt";

interface AuthState {
  token: string | null;
  username: string | null;
}

interface AuthContextType extends AuthState {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getInitialState(): AuthState {
  if (typeof window === "undefined") return { token: null, username: null };
  const token = localStorage.getItem("access_token");
  const username = localStorage.getItem("username");
  if (token && isTokenExpired(token)) {
    clearAuthStorage();
    return { token: null, username: null };
  }
  return { token, username };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(getInitialState);

  const login = useCallback(async (username: string, password: string) => {
    const data = await request<{ access_token: string; token_type: string }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) }
    );
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("username", username);
    setState({ token: data.access_token, username });
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    await request<{ id: string; username: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setState({ token: null, username: null });
  }, []);

  useEffect(() => {
    setOnUnauthorized(logout);
    return () => setOnUnauthorized(null);
  }, [logout]);

  // Auto-logout when JWT expires: check on mount, on token change, on
  // visibility change, and schedule a timeout exactly at exp.
  useEffect(() => {
    if (!state.token) return;

    if (isTokenExpired(state.token)) {
      logout();
      return;
    }

    const expiryMs = getTokenExpiryMs(state.token);
    let timeoutId: number | undefined;

    if (expiryMs !== null) {
      const delay = expiryMs - Date.now();
      if (delay <= 0) {
        logout();
        return;
      }
      timeoutId = window.setTimeout(() => {
        logout();
      }, delay);
    }

    // Fallback polling every 60s + check when tab becomes visible again
    const intervalId = window.setInterval(() => {
      if (state.token && isTokenExpired(state.token)) {
        logout();
      }
    }, 60_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible" && state.token && isTokenExpired(state.token)) {
        logout();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [state.token, logout]);

  const isAuthenticated = state.token !== null && !isTokenExpired(state.token);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAuthenticated,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
