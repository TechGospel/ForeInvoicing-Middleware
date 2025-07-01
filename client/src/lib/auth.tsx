import { createContext, useContext, useEffect, ReactNode } from "react";
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
    const token = localStorage.getItem("authToken");
    if (token) {
      // Set default authorization header
      const originalFetch = window.fetch;
      window.fetch = (input, init = {}) => {
        const headers = new Headers(init.headers);
        headers.set("Authorization", `Bearer ${token}`);
        return originalFetch(input, { ...init, headers });
      };
    }
  }, []);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
