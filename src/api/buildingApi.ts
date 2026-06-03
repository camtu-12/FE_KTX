import axios from "axios";
import type { Building, BuildingFloor, BuildingStatus, FloorGender, FloorStatus } from "../types/building";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const API_ROOT = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

const http = axios.create({
  baseURL: API_ROOT,
});

type ApiFloor = {
  id?: number;
  floorNumber?: number;
  floor_number?: number;
  gender?: string | null;
  roomCount?: number;
  room_count?: number;
  bedCount?: number;
  bed_count?: number;
  occupiedStudents?: number;
  occupied_students?: number;
  status?: string | null;
};

type ApiBuilding = {
  building_code: string;
  name?: string | null;
  address?: string | null;
  status?: string | null;
  floors?: ApiFloor[];
};

type BuildingPayload = {
  building_code: string;
  address: string;
  status: BuildingStatus;
  name?: string;
};

type FloorPayload = {
  floor_number: number;
  gender: FloorGender;
  status: FloorStatus;
};

const normalizeStatus = (status: string | null | undefined): BuildingStatus => {
  const value = (status ?? "ACTIVE").trim().toUpperCase();
  if (value === "MAINTENANCE") return "MAINTENANCE";
  if (value === "INACTIVE") return "INACTIVE";
  return "ACTIVE";
};

const normalizeGender = (gender: string | null | undefined): FloorGender => {
  const value = (gender ?? "MALE").trim().toUpperCase();
  return value === "FEMALE" ? "FEMALE" : "MALE";
};

const normalizeFloor = (floor: ApiFloor): BuildingFloor => ({
  id: floor.id,
  floorNumber: Number(floor.floorNumber ?? floor.floor_number ?? 0) || 0,
  gender: normalizeGender(floor.gender),
  roomCount: floor.roomCount ?? floor.room_count ?? 0,
  bedCount: floor.bedCount ?? floor.bed_count ?? 0,
  occupiedStudents: floor.occupiedStudents ?? floor.occupied_students ?? 0,
  status: normalizeStatus(floor.status),
});

const normalizeBuilding = (building: ApiBuilding): Building => ({
  id: building.building_code,
  building_code: building.building_code,
  name: building.name ?? `Tòa ${building.building_code}`,
  address: building.address ?? undefined,
  status: normalizeStatus(building.status),
  floors: Array.isArray(building.floors) ? building.floors.map(normalizeFloor) : [],
});

export const listBuildings = async (): Promise<Building[]> => {
  const response = await http.get<ApiBuilding[]>("/buildings");
  return Array.isArray(response.data) ? response.data.map(normalizeBuilding) : [];
};

export const getBuilding = async (buildingCode: string): Promise<Building> => {
  const response = await http.get<ApiBuilding>(`/buildings/${encodeURIComponent(buildingCode)}`);
  return normalizeBuilding(response.data);
};

export const createBuilding = async (payload: BuildingPayload): Promise<Building> => {
  const response = await http.post<ApiBuilding>("/buildings", payload);
  return normalizeBuilding(response.data);
};

export const updateBuilding = async (buildingCode: string, payload: BuildingPayload): Promise<Building> => {
  const response = await http.put<ApiBuilding>(`/buildings/${encodeURIComponent(buildingCode)}`, payload);
  return normalizeBuilding(response.data);
};

export const deleteBuilding = async (buildingCode: string): Promise<void> => {
  await http.delete(`/buildings/${encodeURIComponent(buildingCode)}`);
};

export const createFloor = async (buildingCode: string, payload: FloorPayload): Promise<BuildingFloor> => {
  const response = await http.post<ApiFloor>(`/buildings/${encodeURIComponent(buildingCode)}/floors`, payload);
  return normalizeFloor(response.data);
};

export const updateFloor = async (
  buildingCode: string,
  floorNumber: number,
  payload: FloorPayload,
): Promise<BuildingFloor> => {
  const response = await http.put<ApiFloor>(`/buildings/${encodeURIComponent(buildingCode)}/floors/${floorNumber}`, payload);
  return normalizeFloor(response.data);
};

export const deleteFloor = async (buildingCode: string, floorNumber: number): Promise<void> => {
  await http.delete(`/buildings/${encodeURIComponent(buildingCode)}/floors/${floorNumber}`);
};
