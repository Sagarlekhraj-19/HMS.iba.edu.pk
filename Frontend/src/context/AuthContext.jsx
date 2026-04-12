// client/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore user from localStorage
  useEffect(() => {
    const restoreSession = async () => {
      const stored = localStorage.getItem("hms_user");
      const token = localStorage.getItem("hms_token") || localStorage.getItem("token");
      const path = window.location.pathname;
      const isLoginPath = path === "/login" || path === "/admin/login";

      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          localStorage.removeItem("hms_user");
        }
      }

      // Avoid noisy unauthorized probes on login pages when there is no local session marker.
      if (!stored && !token && isLoginPath) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get("/auth/me");
        setUser(res.data);
        localStorage.setItem("hms_user", JSON.stringify(res.data));
      } catch {
        setUser(null);
        localStorage.removeItem("hms_user");
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async ({ erp, password, portal }) => {
    const endpoint = portal === "ADMIN" ? "/auth/admin-login" : "/auth/login";
    const res = await api.post(endpoint, { erp, password });
    const { token, user: u } = res.data;
    if (token) {
      localStorage.setItem("hms_token", token);
      localStorage.setItem("token", token);
    }
    localStorage.setItem("hms_user",  JSON.stringify(u));
    setUser(u);
    return u;
  };

  const register = async (formData) => {
    const res = await api.post("/auth/register", formData);
    const { token, user: u } = res.data;
    if (token) {
      localStorage.setItem("hms_token", token);
      localStorage.setItem("token", token);
    }
    localStorage.setItem("hms_user",  JSON.stringify(u));
    setUser(u);
    return u;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Clear local state regardless of network failure.
    }
    localStorage.removeItem("hms_token");
    localStorage.removeItem("token");
    localStorage.removeItem("hms_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
