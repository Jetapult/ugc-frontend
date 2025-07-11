import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAuthToken as getStoredToken, setAuthToken as storeToken, removeAuthToken as clearToken } from "@/lib/token";

interface AuthContextValue {
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);




export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => getStoredToken());

  const login = async (username: string, password: string) => {
    const data = await api.auth.login(username, password);
    storeToken(data.access_token);
    setToken(data.access_token);
  };

  const logout = () => {
    clearToken();
    setToken(null);
  };

  // keep token in sync if changed in another tab
  useEffect(() => {
    const handler = () => {
      setToken(getStoredToken());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// util for non-react modules – re-export
export const getAuthToken = getStoredToken;
