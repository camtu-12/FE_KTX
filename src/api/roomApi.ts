import axios from "axios";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const API_ROOT = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

const http = axios.create({
  baseURL: API_ROOT,
});

export type RoomStatus = "AVAILABLE" | "FULL" | "MAINTENANCE";
export type BedStatus = "ACTIVE" | "MAINTENANCE";
export type BedPosition = "UPPER" | "LOWER";

export type BedApi = {
  id: number;
  room_id: number;
  bed_number: string;
  position: BedPosition;
  status: BedStatus;
  occupied: boolean;
};

export type RoomApi = {
  id: number;
  floor_id: number;
  building_code: string;
  room_number: string;
  floor_number: number;
  capacity: number;
  price_per_quarter: number;
  status: RoomStatus;
  beds: BedApi[];
  occupied_beds: number;
  available_beds: number;
  maintenance_beds: number;
  floor?: {
    id: number;
    building_code: string;
    floor_number: number;
    gender?: string | null;
    status?: string | null;
  } | null;
};

export type RoomPayload = {
  floor_id: number;
  room_number: string;
  capacity: number;
  status?: "active" | "maintenance";
  price_per_quarter?: number;
  maintenance_beds?: number[];
};

export type BedPayload = {
  status: "empty" | "maintenance";
};

type ApiBed = {
  id: number;
  room_id: number;
  bed_number: number | string;
  position?: string | null;
  status?: string | null;
  occupied?: boolean;
};

type ApiRoom = {
  id: number;
  floor_id: number;
  building_code?: string;
  room_number: number | string;
  floor_number?: number;
  capacity: number;
  price_per_quarter?: number | string | null;
  status?: string | null;
  beds?: ApiBed[];
  occupied_beds?: number;
  available_beds?: number;
  maintenance_beds?: number;
  floor?: RoomApi["floor"];
};

const normalizeRoomStatus = (status: string | null | undefined): RoomStatus => {
  const value = (status ?? "AVAILABLE").trim().toUpperCase();
  if (value === "MAINTENANCE") return "MAINTENANCE";
  if (value === "FULL") return "FULL";
  return "AVAILABLE";
};

const normalizeBedStatus = (status: string | null | undefined): BedStatus => {
  return (status ?? "ACTIVE").trim().toUpperCase() === "MAINTENANCE" ? "MAINTENANCE" : "ACTIVE";
};

const normalizeBed = (bed: ApiBed): BedApi => ({
  id: bed.id,
  room_id: bed.room_id,
  bed_number: String(bed.bed_number),
  position: (String(bed.position ?? "UPPER").trim().toUpperCase() === "LOWER" ? "LOWER" : "UPPER"),
  status: normalizeBedStatus(bed.status),
  occupied: Boolean(bed.occupied),
});

const normalizeRoom = (room: ApiRoom): RoomApi => ({
  id: room.id,
  floor_id: room.floor_id,
  building_code: room.building_code ?? room.floor?.building_code ?? "",
  room_number: String(room.room_number),
  floor_number: room.floor_number ?? room.floor?.floor_number ?? 0,
  capacity: Number(room.capacity) || 0,
  price_per_quarter: Number(room.price_per_quarter ?? 0) || 0,
  status: normalizeRoomStatus(room.status),
  beds: Array.isArray(room.beds) ? room.beds.map(normalizeBed) : [],
  occupied_beds: Number(room.occupied_beds ?? 0) || 0,
  available_beds: Number(room.available_beds ?? 0) || 0,
  maintenance_beds: Number(room.maintenance_beds ?? 0) || 0,
  floor: room.floor ?? null,
});

export const listRooms = async (): Promise<RoomApi[]> => {
  const response = await http.get<ApiRoom[]>('/rooms');
  return Array.isArray(response.data) ? response.data.map(normalizeRoom) : [];
};

export const createRoom = async (payload: RoomPayload): Promise<RoomApi> => {
  const response = await http.post<ApiRoom>('/rooms', payload);
  return normalizeRoom(response.data);
};

export const updateRoom = async (roomId: number, payload: RoomPayload): Promise<RoomApi> => {
  const response = await http.put<ApiRoom>(`/rooms/${roomId}`, payload);
  return normalizeRoom(response.data);
};

export const deleteRoom = async (roomId: number): Promise<void> => {
  await http.delete(`/rooms/${roomId}`);
};

export const updateBedStatus = async (roomId: number, bedId: number, payload: BedPayload): Promise<RoomApi> => {
  const response = await http.put<ApiRoom>(`/rooms/${roomId}/beds/${bedId}`, payload);
  return normalizeRoom(response.data);
};
