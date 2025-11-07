import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { login, register, getCurrentUser } from "../services/api";
import { storage } from "../utils/storage";

type Role = "CUSTOMER" | "CATER" | "ADMIN" | "CUSTOM";

const TOKEN_KEY = "caterhub_token";

export type User = {
  id: string; // UUID string, not number
  email: string;
  username: string;
  role: Role;
  location?: string | null;   // optional location field (legacy)
  profile_image_url?: string | null; // profile image URL from users table
};

type AuthContext = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateMe: (patch: { location?: string | null; username?: string; profile_image_url?: string | null }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
};

const Ctx = createContext<AuthContext>(null as any);
export const useAuth = () => useContext(Ctx);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper: set/unset axios Authorization header consistently
  const setAxiosAuthHeader = (tok?: string | null) => {
    // Note: We're using Supabase client directly, so no need for axios headers
    // This function is kept for compatibility but doesn't do anything
  };

  const deleteAccount = async (password: string) => {
    if (!user?.email || !user?.id) throw new Error('Missing user context');

    // Re-authenticate to verify password
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (loginError || !loginData.session) {
      throw new Error('Incorrect password');
    }

    // Invoke secured Edge Function to delete auth user (requires service role on server)
    const { error: fnError } = await supabase.functions.invoke('delete-user', {
      body: { userId: user.id },
    });
    if (fnError) {
      throw new Error(fnError.message || 'Failed to delete account');
    }

    // Local sign-out and cleanup
    await logout();
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
        await storage.removeItem(TOKEN_KEY);
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
      await storage.setItem(TOKEN_KEY, token);
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
    // Sign out from Supabase (this clears Supabase session)
    await supabase.auth.signOut();
    
    // Clear local state
    setUser(null);
    setToken(null);
    setAxiosAuthHeader(null);
    await storage.removeItem(TOKEN_KEY);
    
    // On web, also clear all Supabase-related localStorage items
    if (typeof window !== 'undefined') {
      const supabaseKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || key.includes('supabase')
      );
      supabaseKeys.forEach(key => localStorage.removeItem(key));
    }
  };

  const refreshUser = async () => {
    try {
      const userProfile = await getCurrentUser();
      if (userProfile) {
        setUser(userProfile as User);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const updateMe = async (patch: { location?: string | null; username?: string }) => {
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

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user?.email) throw new Error('Missing email for authenticated user');

    // Re-authenticate to ensure the current password is valid
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (loginError || !loginData.session) {
      throw new Error('Current password is incorrect');
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    const { data: sessionData } = await supabase.auth.getSession();
    const nextToken = sessionData.session?.access_token ?? loginData.session.access_token;
    if (nextToken) {
      await storage.setItem(TOKEN_KEY, nextToken);
      setToken(nextToken);
      setAxiosAuthHeader(nextToken);
    }
  };

  return (
    <Ctx.Provider value={{ user, token, loading, login: loginUser, logout, refreshUser, updateMe, changePassword, deleteAccount }}>
      {children}
    </Ctx.Provider>
  );
};
