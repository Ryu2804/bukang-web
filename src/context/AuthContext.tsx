import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { request } from "../services/api";

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
  return {
    token: localStorage.getItem("access_token"),
    username: localStorage.getItem("username"),
  };
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
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    setState({ token: null, username: null });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAuthenticated: state.token !== null,
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
