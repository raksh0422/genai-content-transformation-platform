"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type UserProfile } from "./api";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadAuth() {
      try {
        const storedToken = localStorage.getItem("contentai_auth_token");
        const storedUser = localStorage.getItem("contentai_auth_user");

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch {
              /* ignore parse error */
            }
          }
          // Verify with backend
          try {
            const freshUser = await api.getMe();
            setUser(freshUser);
            localStorage.setItem("contentai_auth_user", JSON.stringify(freshUser));
          } catch {
            // Token is invalid/expired
            localStorage.removeItem("contentai_auth_token");
            localStorage.removeItem("contentai_auth_user");
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Failed to load auth state:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAuth();
  }, []);

  const login = (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
    try {
      localStorage.setItem("contentai_auth_token", newToken);
      localStorage.setItem("contentai_auth_user", JSON.stringify(newUser));
      // Set secure cookie for route guards
      document.cookie = `contentai_token=${newToken}; path=/; max-age=2592000; SameSite=Lax`;
    } catch (e) {
      console.warn("Storage error:", e);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    } finally {
      setToken(null);
      setUser(null);
      try {
        localStorage.removeItem("contentai_auth_token");
        localStorage.removeItem("contentai_auth_user");
        document.cookie = "contentai_token=; path=/; max-age=0";
      } catch {
        /* ignore */
      }
      router.push("/login");
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const fresh = await api.getMe();
      setUser(fresh);
      localStorage.setItem("contentai_auth_user", JSON.stringify(fresh));
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  };

  const isAuthenticated = Boolean(token && user);
  const isAdmin = Boolean(user && user.role === "admin");

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isAdmin,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
