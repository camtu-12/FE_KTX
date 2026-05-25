import axios from "axios";

// ✅ ĐÚNG - Lấy từ environment variables
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

console.log("[API] Base URL:", API_BASE); // Debug log

const API = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Thêm interceptor để log requests/errors
API.interceptors.response.use(
  response => response,
  error => {
    console.error("[API Error]", error.config?.url, error.message);
    return Promise.reject(error);
  }
);

// ================== LẤY ==================
export const getMyRegistration = (email: string) => {
  return API.get(`/registration/me`, {
    params: { email },
  }).then((res) => res.data);
};

export const getRegistrationHistory = (email: string, semester: string) => {
  return API.get(`/registration/history/${email}/${semester}`).then((res) => res.data);
};

// ================== GỬI ==================
export const submitRegistration = (formData: FormData) => {
  return API.post(`/registration`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  }).then((res) => res.data);
};

export const getRegistrationById = (id: number) => {
  return API.get(`/registration/${id}`).then((res) => res.data);
};

export const getRegistrations = () => {
  return API.get("/registration").then((res) => res.data);
};

export const getRooms = () => {
  return API.get("/rooms").then((res) => res.data);
};