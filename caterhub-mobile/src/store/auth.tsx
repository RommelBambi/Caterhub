import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../services/supabase";
import { login, register, getCurrentUser } from "../services/api";

type Role = "CUSTOMER" | "CATER" | "ADMIN" | "CUSTOM";

export type User = {
  id: string; // UUID string, not number
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
    // Note: We're using Supabase client directly, so no need for axios headers
    // This function is kept for compatibility but doesn't do anything
  };

  // Bootstrap: restore session and fetch user profile
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setToken(session.access_token);
          setAxiosAuthHeader(session.access_token);
          const userProfile = await getCurrentUser();
          setUser(userProfile as User);
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

  const loginUser = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { token, user: userProfile } = await login(email, password);

      // persist + set header
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      setAxiosAuthHeader(token);

      setToken(token);
      setUser(userProfile as User);
    } catch (e) {
      throw e; // bubble up so UI can show error
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
    setAxiosAuthHeader(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  };

  const updateMe = async (patch: { location?: string; username?: string }) => {
    if (!token) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', user.id)
      .select()
      .single();
      
    if (error) throw error;
    setUser((u) => (u ? { ...u, ...data } : data));
  };

  return (
    <Ctx.Provider value={{ user, token, loading, login: loginUser, logout, updateMe }}>
      {children}
    </Ctx.Provider>
  );
};
