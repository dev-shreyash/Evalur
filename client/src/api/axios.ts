import axios from "axios";
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8081/api/v1";

const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Keep this if your JWT auth uses cookies/credentials
});
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
  
  // Only attach the token if it exists AND we aren't hitting an auth route
  if (token && !config.url?.includes("/auth/")) {
    config.headers.Authorization = `Bearer ${token}`;
  }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;