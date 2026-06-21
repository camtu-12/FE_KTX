import axios from "axios";
import type { ActivityCategory, ViolationLevel } from "./violationTypeApi";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const API_ROOT = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

const http = axios.create({
  baseURL: API_ROOT,
});

export type ViolationRecord = {
  id: number;
  occupancyId: number;
  typeId: number;
  violationDate: string;
  status: "PENDING" | "RESOLVED";
  actionTaken: "reward_recorded" | "reminded" | "warned" | "force_evicted" | null;
  note: string;
  student: {
    id: number;
    studentCode: string;
    fullName: string;
  } | null;
  room: {
    buildingCode: string;
    roomNumber: string;
    displayName: string | null;
  };
  bed: {
    bedNumber: string;
    displayName: string | null;
  };
  type: {
    id: number;
    name: string;
    level: ViolationLevel;
    category: ActivityCategory;
    points: number;
    description: string;
  } | null;
};

export type ViolationPayload = {
  occupancy_id: number;
  type_id: number;
  violation_date: string;
  note: string;
  action_taken?: "reward_recorded" | "reminded" | "warned" | "force_evicted";
};

type ApiViolation = {
  id: number;
  occupancy_id?: number | string | null;
  type_id?: number | string | null;
  violation_date?: string | null;
  status?: string | null;
  action_taken?: string | null;
  note?: string | null;
  student?: {
    id?: number;
    student_code?: string | null;
    full_name?: string | null;
  } | null;
  room?: {
    building_code?: string | null;
    room_number?: string | null;
    display_name?: string | null;
  } | null;
  bed?: {
    bed_number?: string | null;
    display_name?: string | null;
  } | null;
  type?: {
    id?: number;
    name?: string | null;
    level?: string | null;
    category?: string | null;
    points?: number | string | null;
    description?: string | null;
  } | null;
};

const normalizeLevel = (level: string | null | undefined): ViolationLevel => {
  const value = (level ?? "MINOR").trim().toUpperCase();
  if (value === "MEDIUM") return "MEDIUM";
  if (value === "SERIOUS") return "SERIOUS";
  return "MINOR";
};

const normalizeStatus = (status: string | null | undefined): ViolationRecord["status"] => {
  return (status ?? "pending").trim().toUpperCase() === "RESOLVED" ? "RESOLVED" : "PENDING";
};

const normalizeAction = (action: string | null | undefined): ViolationRecord["actionTaken"] => {
  const rawValue = (action ?? "").trim();
  const value = rawValue.toUpperCase();
  if (value === "REWARD_RECORDED") return "reward_recorded";
  if (value === "REMINDED" || value === "WARNING") return "reminded";
  if (value === "WARNED") return "warned";
  if (value === "FORCE_EVICTED" || value === "FORCED_CHECKOUT") return "force_evicted";
  return null;
};

const normalizeCategory = (category: string | null | undefined): ActivityCategory => {
  return (category ?? "").trim().toLowerCase() === "positive" ? "positive" : "negative";
};

const normalizeViolation = (item: ApiViolation): ViolationRecord => ({
  id: Number(item.id),
  occupancyId: Number(item.occupancy_id ?? 0),
  typeId: Number(item.type_id ?? item.type?.id ?? 0),
  violationDate: item.violation_date ?? "",
  status: normalizeStatus(item.status),
  actionTaken: normalizeAction(item.action_taken),
  note: item.note ?? "",
  student: item.student
    ? {
        id: Number(item.student.id ?? 0),
        studentCode: item.student.student_code ?? "",
        fullName: item.student.full_name ?? "",
      }
    : null,
  room: {
    buildingCode: item.room?.building_code ?? "",
    roomNumber: item.room?.room_number ?? "",
    displayName: item.room?.display_name ?? null,
  },
  bed: {
    bedNumber: item.bed?.bed_number ?? "",
    displayName: item.bed?.display_name ?? null,
  },
  type: item.type
    ? {
        id: Number(item.type.id ?? item.type_id ?? 0),
        name: item.type.name ?? "",
        level: normalizeLevel(item.type.level),
        category: normalizeCategory(item.type.category),
        points: Number(item.type.points ?? 0),
        description: item.type.description ?? "",
      }
    : null,
});

export const listViolations = async (): Promise<ViolationRecord[]> => {
  const response = await http.get<ApiViolation[]>("/violations");
  return Array.isArray(response.data) ? response.data.map(normalizeViolation) : [];
};

export const listViolationsByStudentEmail = async (email: string): Promise<ViolationRecord[]> => {
  const response = await http.get<ApiViolation[]>("/violations", {
    params: { student_email: email },
  });
  return Array.isArray(response.data) ? response.data.map(normalizeViolation) : [];
};

export const listViolationsByStudentId = async (studentId: number): Promise<ViolationRecord[]> => {
  const response = await http.get<ApiViolation[]>("/violations", {
    params: { student_id: studentId },
  });
  return Array.isArray(response.data) ? response.data.map(normalizeViolation) : [];
};

export const listViolationsByOccupancy = async (occupancyId: number): Promise<ViolationRecord[]> => {
  const response = await http.get<ApiViolation[]>("/violations", {
    params: { occupancy_id: occupancyId },
  });
  return Array.isArray(response.data) ? response.data.map(normalizeViolation) : [];
};

export const createViolation = async (payload: ViolationPayload): Promise<ViolationRecord> => {
  const response = await http.post<ApiViolation>("/violations", payload);
  return normalizeViolation(response.data);
};

export const updateViolation = async (id: number, payload: ViolationPayload): Promise<ViolationRecord> => {
  const response = await http.put<ApiViolation>(`/violations/${id}`, payload);
  return normalizeViolation(response.data);
};

export const processViolation = async (
  id: number,
  payload: { action_taken: "reminded" | "warned" | "force_evicted"; note: string },
): Promise<ViolationRecord> => {
  const response = await http.put<ApiViolation>(`/violations/${id}/process`, payload);
  return normalizeViolation(response.data);
};

export const deleteViolation = async (id: number): Promise<void> => {
  await http.delete(`/violations/${id}`);
};
