import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, User, getGetMeQueryKey } from "@workspace/api-client-react";
import { clearAuthToken, getAuthToken } from "./auth";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null | undefined; // undefined means loading
  isLoading: boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: undefined,
  isLoading: true,
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const token = getAuthToken();
  const { data: user, isLoading: isUserLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetMeQueryKey(),
    }
  });

  const isLoading = isUserLoading && !!token;
  
  useEffect(() => {
    if (error) {
      clearAuthToken();
    }
  }, [error]);

  const logout = () => {
    clearAuthToken();
    setLocation("/login");
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{
      user: user ?? null,
      isLoading,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
}
