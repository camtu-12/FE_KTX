import axios from "axios";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

// Ensure we don't end up with /api/api if the env already contains /api
const API_ROOT = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

export const API = axios.create({
  baseURL: API_ROOT, // BE Laravel root (robust to env value)
});

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