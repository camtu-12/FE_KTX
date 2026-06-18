import axios from "axios";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const API_ROOT = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

const http = axios.create({
  baseURL: API_ROOT,
});

export type ViolationLevel = "MINOR" | "MEDIUM" | "SERIOUS";
export type ActivityCategory = "positive" | "negative";

export type ViolationType = {
  id: number;
  name: string;
  level: ViolationLevel;
  category: ActivityCategory;
  points: number;
  description: string;
};

export type ViolationTypePayload = {
  name: string;
  category: ActivityCategory;
  level?: ViolationLevel;
  points: number;
  description: string;
};

export class ViolationTypeApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ViolationTypeApiError";
    this.status = status;
  }
}

type ApiViolationType = {
  id: number;
  name?: string | null;
  level?: string | null;
  category?: string | null;
  points?: number | string | null;
  description?: string | null;
};

const normalizeLevel = (level: string | null | undefined): ViolationLevel => {
  const value = (level ?? "MINOR").trim().toUpperCase();
  if (value === "MEDIUM") return "MEDIUM";
  if (value === "SERIOUS") return "SERIOUS";
  return "MINOR";
};

const normalizeCategory = (category: string | null | undefined): ActivityCategory => {
  return (category ?? "").trim().toLowerCase() === "positive" ? "positive" : "negative";
};

const normalizeViolationType = (item: ApiViolationType): ViolationType => ({
  id: Number(item.id),
  name: item.name ?? "",
  level: normalizeLevel(item.level),
  category: normalizeCategory(item.category),
  points: Number(item.points ?? 0),
  description: item.description ?? "",
});

export const listViolationTypes = async (): Promise<ViolationType[]> => {
  const response = await http.get<ApiViolationType[]>("/violation-types");
  return Array.isArray(response.data) ? response.data.map(normalizeViolationType) : [];
};

export const createViolationType = async (payload: ViolationTypePayload): Promise<ViolationType> => {
  const response = await http.post<ApiViolationType>("/violation-types", payload);
  return normalizeViolationType(response.data);
};

export const updateViolationType = async (id: number, payload: ViolationTypePayload): Promise<ViolationType> => {
  const response = await http.put<ApiViolationType>(`/violation-types/${id}`, payload);
  return normalizeViolationType(response.data);
};

export const deleteViolationType = async (id: number): Promise<void> => {
  try {
    await http.delete(`/violation-types/${id}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data as { message?: string } | undefined;
      throw new ViolationTypeApiError(responseData?.message ?? "Khong the xoa loai vi pham.", error.response?.status);
    }

    throw error;
  }
};
