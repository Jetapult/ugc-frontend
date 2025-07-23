import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAuthToken as getStoredToken, setAuthToken as storeToken, removeAuthToken as clearToken } from "@/lib/token";

interface AuthContextValue {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);




export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => getStoredToken());

  const login = async (email: string, password: string) => {
    const data: any = await api.auth.login(email, password);
    // Support both { access_token } and { data: { token } } response shapes
    const tokenResp: string | undefined = data?.access_token ?? data?.token ?? data?.data?.token;
    if (!tokenResp) {
      throw new Error("Login response did not contain a token");
    }
    storeToken(tokenResp);
    setToken(tokenResp);
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
