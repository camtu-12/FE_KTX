import axios from "axios";
import type { RoomApi } from "./roomApi";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const API_ROOT = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

const http = axios.create({
  baseURL: API_ROOT,
});

export type MaintenanceStudent = {
  id: number;
  student_code: string;
  full_name: string;
  avatar: string | null;
};

export type MaintenanceRoomHeader = {
  id: number;
  room_number: string;
  room_code: string;
  building_code: string;
  floor_number: number;
  gender: string;
  status: string;
};

export type MaintenanceBedOption = {
  id: number;
  bed_number: string;
  room_id: number;
  room_code: string;
  floor_number: number;
  building_code: string;
  position: "top" | "bottom";
  priority: number;
  priority_labels?: string[];
};

export type BedMaintenancePlan = {
  source: {
    room: MaintenanceRoomHeader;
    bed: {
      id: number;
      bed_number: string;
      position: "top" | "bottom";
      status: string;
    };
    occupancy_id: number | null;
    student: MaintenanceStudent | null;
  };
  options: MaintenanceBedOption[];
};

export type RoomMaintenancePlan = {
  room: MaintenanceRoomHeader;
  affected: Array<{
    occupancy_id: number;
    student: MaintenanceStudent | null;
    current_room: string;
    current_bed: string;
    original_room_id?: number | null;
    original_room_code?: string | null;
    original_bed_id?: number | null;
    original_bed_number?: string | null;
    current_room_id?: number | null;
    current_bed_id?: number | null;
    target: MaintenanceBedOption | null;
  }>;
  options: MaintenanceBedOption[];
  can_start: boolean;
};

export type RoomMaintenanceAssignment = {
  occupancy_id: number;
  target_bed_id: number;
  original_room_id?: number | null;
  original_bed_id?: number | null;
  original_room_code?: string | null;
  original_bed_number?: string | null;
};

export type StartRoomMaintenancePayload = {
  assignments: RoomMaintenanceAssignment[];
  reason: string;
  started_at: string;
  expected_end_at: string;
  note?: string;
  maintenance_reason?: string;
  maintenance_start_date?: string;
  maintenance_expected_end_date?: string;
  is_temporary_relocation?: boolean;
};

export const getBedMaintenancePlan = async (roomId: number, bedId: number): Promise<BedMaintenancePlan> => {
  const response = await http.get<BedMaintenancePlan>(`/maintenance/rooms/${roomId}/beds/${bedId}/plan`);
  return response.data;
};

export const startBedMaintenance = async (roomId: number, bedId: number, targetBedId: number): Promise<RoomApi> => {
  const response = await http.post<RoomApi>(`/maintenance/rooms/${roomId}/beds/${bedId}/start`, {
    target_bed_id: targetBedId,
  });
  return response.data;
};

export const completeBedMaintenance = async (roomId: number, bedId: number): Promise<RoomApi> => {
  const response = await http.post<RoomApi>(`/maintenance/rooms/${roomId}/beds/${bedId}/complete`);
  return response.data;
};

export const getRoomMaintenancePlan = async (roomId: number): Promise<RoomMaintenancePlan> => {
  const response = await http.get<RoomMaintenancePlan>(`/maintenance/rooms/${roomId}/plan`);
  return response.data;
};

export const startRoomMaintenance = async (
  roomId: number,
  payload: StartRoomMaintenancePayload,
): Promise<RoomApi> => {
  const response = await http.post<RoomApi>(`/maintenance/rooms/${roomId}/start`, payload);
  return response.data;
};

export const completeRoomMaintenance = async (roomId: number): Promise<RoomApi> => {
  const response = await http.post<RoomApi>(`/maintenance/rooms/${roomId}/complete`);
  return response.data;
};

export const completeRoomMaintenanceStudent = async (roomId: number, occupancyId: number): Promise<RoomApi> => {
  const response = await http.post<RoomApi>(`/maintenance/rooms/${roomId}/complete-student/${occupancyId}`);
  return response.data;
};
