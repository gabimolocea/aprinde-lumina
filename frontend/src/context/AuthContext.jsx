import { createContext, useContext, useState, useCallback } from "react";
import { requestOTP, verifyOTP, fetchMe, logout as apiLogout } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Restore from localStorage on first load
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);

  const saveAuth = useCallback((tok, usr) => {
    localStorage.setItem("token", tok);
    localStorage.setItem("user", JSON.stringify(usr));
    setToken(tok);
    setUser(usr);
  }, []);

  const sendOTP = useCallback(async (phone) => {
    await requestOTP(phone);
  }, []);

  const confirmOTP = useCallback(
    async (phone, code) => {
      const data = await verifyOTP(phone, code);
      saveAuth(data.token, data.user);
    },
    [saveAuth]
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout(token);
    } catch {
      // ignore network errors on logout
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const usr = await fetchMe(token);
    localStorage.setItem("user", JSON.stringify(usr));
    setUser(usr);
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, sendOTP, confirmOTP, logout, refreshUser, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
