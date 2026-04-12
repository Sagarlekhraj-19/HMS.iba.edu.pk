import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_BASE_URL = rawBaseUrl.endsWith("/api") || rawBaseUrl === "/api"
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/$/, "")}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hms_token") || localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("hms_token");
      localStorage.removeItem("token");
      localStorage.removeItem("hms_user");

      const path = window.location.pathname;
      const isStudentLogin = path === "/login";
      const isAdminLogin = path === "/admin/login";
      if (isStudentLogin || isAdminLogin) {
        return Promise.reject(error);
      }

      const isAdminArea = window.location.pathname.startsWith("/admin");
      window.location.href = isAdminArea ? "/admin/login" : "/login";
    }
    return Promise.reject(error);
  }
);

export { API_BASE_URL };
export default api;
