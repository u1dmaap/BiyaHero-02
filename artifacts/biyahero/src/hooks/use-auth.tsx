import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, User, getGetMeQueryKey } from "@workspace/api-client-react";
import { clearAuthToken, getAuthToken } from "./auth";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null | undefined; // undefined means loading
  isLoading: boolean;
  logout: () => void;
  isAuthenticated: boolean;
  isDriver: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: undefined,
  isLoading: true,
  logout: () => {},
  isAuthenticated: false,
  isDriver: false,
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

  const isDriver = user?.role === "driver";

  return (
    <AuthContext.Provider value={{
      user: user ?? null,
      isLoading,
      logout,
      isAuthenticated: !!user,
      isDriver,
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function DriverGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isDriver } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) setLocation("/login");
      else if (!isDriver) setLocation("/");
    }
  }, [isLoading, isAuthenticated, isDriver, setLocation]);

  if (isLoading || !isAuthenticated || !isDriver) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
