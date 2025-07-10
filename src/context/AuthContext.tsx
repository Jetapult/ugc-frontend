import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextValue {
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const BACKEND_URL = (import.meta as any).env?.BACKEND_URL || "http://localhost:8001";
const LOGIN_ENDPOINT = `${BACKEND_URL.replace(/\/$/, "")}/api/auth/token`;
const STORAGE_KEY = "auth_token";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));

  const login = async (username: string, password: string) => {
    const res = await fetch(LOGIN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      let message = "Login failed";
      try {
        const errorJson = await res.json();
        message = errorJson?.detail || JSON.stringify(errorJson);
      } catch {
        message = await res.text();
      }
      throw new Error(message);
    }
    const data = await res.json();
    if (!data.access_token) throw new Error("Invalid response");
    localStorage.setItem(STORAGE_KEY, data.access_token);
    setToken(data.access_token);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
  };

  // keep token in sync if changed in another tab
  useEffect(() => {
    const handler = () => {
      setToken(localStorage.getItem(STORAGE_KEY));
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

// util for non-react modules
export const getAuthToken = (): string | null => localStorage.getItem(STORAGE_KEY);
