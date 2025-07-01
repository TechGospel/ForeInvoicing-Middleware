import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

interface AuthContextType {
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: any) => void;
  logout: () => void;
  isLoggingIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      // Set default authorization header for all fetch requests
      const originalFetch = window.fetch;
      window.fetch = (input, init = {}) => {
        const headers = new Headers(init.headers);
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        return originalFetch(input, { ...init, headers });
      };
    }
  }, [auth.user]);

  return React.createElement(AuthContext.Provider, { value: auth }, children);
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

// Utility function to get auth token
export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

// Utility function to set auth token
export function setAuthToken(token: string): void {
  localStorage.setItem("auth_token", token);
}

// Utility function to remove auth token
export function removeAuthToken(): void {
  localStorage.removeItem("auth_token");
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}
