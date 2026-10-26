import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

let onSessionExpired: (() => void) | null = null;

export const setSessionExpiredHandler = (handler: () => void) => {
  onSessionExpired = handler;
};

const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    const isPublicAuthRoute =
      config.url?.includes("/auth/login") || config.url?.includes("/auth/register");

    // Attach token to authenticated routes; explicitly exclude public login/register
    if (token && !isPublicAuthRoute) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRoute = error.config?.url?.includes("/auth/login");
    // 401 on an authenticated endpoint indicates an expired/invalid session
    if (error.response?.status === 401 && !isLoginRoute) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
      if (onSessionExpired) {
        onSessionExpired();
      }
    }
    // Note: 403, 5xx, timeouts, and network errors DO NOT clear the session here.
    return Promise.reject(error);
  }
);

export default api;
