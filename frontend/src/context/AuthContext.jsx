import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  registerTokenGetter, registerUnauthorizedHandler,
  login as apiLogin, signup as apiSignup, logoutRequest, fetchMe,
} from "../api.js";

const TOKEN_KEY = "kpa_token";

// "Remember me" -> localStorage (survives browser restarts).
// Otherwise -> sessionStorage (cleared when the tab closes).
function readStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
}
function storeToken(token, rememberMe) {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if (!token) return;
  (rememberMe ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

// Role → default landing tab, used right after login for the
// "redirect users to their respective dashboards" requirement.
export const ROLE_HOME_TAB = {
  admin: "dashboard",
  staff: "booking",
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    registerTokenGetter(() => token);
  }, [token]);

  const clearSession = useCallback(() => {
    storeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(clearSession);
  }, [clearSession]);

  // On mount (or whenever the token changes), confirm the session is still
  // valid and hydrate the user object.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchMe()
      .then(({ data }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = useCallback(async (email, password, rememberMe) => {
    const { data } = await apiLogin({ email, password, rememberMe });
    storeToken(data.token, rememberMe);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (name, email, password, role) => {
    const { data } = await apiSignup({ name, email, password, role });
    // Backend now auto-verifies and returns a token/user just like login,
    // so a fresh signup drops the person straight into the app.
    storeToken(data.token, false);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) await logoutRequest();
    } catch {
      // Best-effort audit log entry — logging out client-side still works
      // even if the request fails (e.g. offline).
    }
    clearSession();
  }, [token, clearSession]);

  const refreshUser = useCallback(async () => {
    if (!token) return null;
    const { data } = await fetchMe();
    setUser(data.user);
    return data.user;
  }, [token]);

  const value = useMemo(
    () => ({ user, token, loading, isAuthenticated: !!user, login, signup, logout, refreshUser }),
    [user, token, loading, login, signup, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
