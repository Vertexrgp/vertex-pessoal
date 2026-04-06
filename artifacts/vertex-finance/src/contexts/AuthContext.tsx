import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getApiBase } from "@/lib/api-base";

const API = getApiBase();

type User = { id: number; name: string; email: string };
type AuthState = { user: User | null; loading: boolean };

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  async function fetchMe() {
    try {
      const r = await fetch(`${API}/api/auth/me`, { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setState({ user: data.user, loading: false });
      } else {
        setState({ user: null, loading: false });
      }
    } catch {
      setState({ user: null, loading: false });
    }
  }

  useEffect(() => { fetchMe(); }, []);

  async function login(email: string, password: string) {
    const r = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erro ao entrar");
    setState({ user: data.user, loading: false });
  }

  async function register(name: string, email: string, password: string) {
    const r = await fetch(`${API}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erro ao criar conta");
    setState({ user: data.user, loading: false });
  }

  async function logout() {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
    setState({ user: null, loading: false });
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refetch: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
