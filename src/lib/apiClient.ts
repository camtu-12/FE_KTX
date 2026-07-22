import axios from "axios";
import { getStoredAuth } from "../modules/auth/utils/authStorage";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const API_ROOT = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

const apiClient = axios.create({ baseURL: API_ROOT });

apiClient.interceptors.request.use((config) => {
  const token = getStoredAuth()?.token;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

export default apiClient;
