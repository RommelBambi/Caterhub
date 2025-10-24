import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api } from "../services/api";

type Role = "CUSTOMER" | "CATER" | "ADMIN";

export type User = {
  id: number;
  email: string;
  username: string;
  role: Role;
  location?: string | null;   // optional location field
};

type AuthContext = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateMe: (patch: { location?: string; username?: string }) => Promise<void>;
};

const Ctx = createContext<AuthContext>(null as any);
export const useAuth = () => useContext(Ctx);

const TOKEN_KEY = "caterhub_token";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper: set/unset axios Authorization header consistently
  const setAxiosAuthHeader = (tok?: string | null) => {
    if (tok) {
      api.defaults.headers.common["Authorization"] = `Bearer ${tok}`;
    } else {
      delete api.defaults.headers.common["Authorization"];
    }
  };

  // Bootstrap: restore token from SecureStore and fetch /auth/me
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (saved) {
          setToken(saved);
          setAxiosAuthHeader(saved);
          const { data } = await api.get("/auth/me");
          setUser(data as User);
        }
      } catch {
        setUser(null);
        setToken(null);
        setAxiosAuthHeader(null);
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const tok = data.token as string;

      // persist + set header
      await SecureStore.setItemAsync(TOKEN_KEY, tok);
      setAxiosAuthHeader(tok);

      setToken(tok);
      setUser({
        id: data.id,
        email: data.email,
        username: data.username,
        role: data.role as Role,
        location: data.location ?? null,
      });
    } catch (e) {
      throw e; // bubble up so UI can show error
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setAxiosAuthHeader(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  };

  const updateMe = async (patch: { location?: string; username?: string }) => {
    if (!token) return;
    const { data } = await api.patch("/users/me", patch);
    setUser((u) => (u ? { ...u, ...data } : data));
  };

  return (
    <Ctx.Provider value={{ user, token, loading, login, logout, updateMe }}>
      {children}
    </Ctx.Provider>
  );
};
