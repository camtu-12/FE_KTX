import apiClient from "../lib/apiClient";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

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

export type ScheduledMaintenance = {
  id: number;
  reason: string | null;
  started_at: string | null;
  expected_end_at: string | null;
};

export type RoomApi = {
  id: number;
  floor_id: number;
  building_code: string;
  room_number: string;
  floor_number: number;
  capacity: number;
  price_per_month: number;
  status: RoomStatus;
  beds: BedApi[];
  occupied_beds: number;
  available_beds: number;
  maintenance_beds: number;
  scheduled_maintenance: ScheduledMaintenance | null;
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
  price_per_month?: number;
  maintenance_beds?: number[];
};

export type BedPayload = {
  status: "active" | "maintenance";
};

export type TransferBedPayload = {
  target_bed_id: number;
  source_status?: BedPayload["status"];
  change_type?: "PERMANENT" | "TEMPORARY_MAINTENANCE";
  transfer_type?: "PERMANENT" | "TEMP_MAINTENANCE";
  reason?: string;
  expected_return_date?: string;
  maintenance_reason?: string;
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
  price_per_month?: number | string | null;
  status?: string | null;
  beds?: ApiBed[];
  occupied_beds?: number;
  available_beds?: number;
  maintenance_beds?: number;
  scheduled_maintenance?: ScheduledMaintenance | null;
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
  price_per_month: Number(room.price_per_month ?? 0) || 0,
  status: normalizeRoomStatus(room.status),
  beds: Array.isArray(room.beds) ? room.beds.map(normalizeBed) : [],
  occupied_beds: Number(room.occupied_beds ?? 0) || 0,
  available_beds: Number(room.available_beds ?? 0) || 0,
  maintenance_beds: Number(room.maintenance_beds ?? 0) || 0,
  scheduled_maintenance: room.scheduled_maintenance ?? null,
  floor: room.floor ?? null,
});

export const listRooms = async (): Promise<RoomApi[]> => {
  const response = await apiClient.get<ApiRoom[]>('/rooms');
  return Array.isArray(response.data) ? response.data.map(normalizeRoom) : [];
};

export const exportRoomsPdf = async (params?: {
  building?: string;
  floor?: string;
  gender?: string;
  status?: string;
}): Promise<{ blob: Blob; filename: string }> => {
  const response = await apiClient.get("/rooms/pdf", { params, responseType: "blob" });
  return { blob: response.data as Blob, filename: "danh_sach_phong.pdf" };
};

export const exportRoomsExcel = async (params?: {
  building?: string;
  floor?: string;
  gender?: string;
  status?: string;
}): Promise<{ blob: Blob; filename: string }> => {
  const response = await apiClient.get("/rooms/excel", { params, responseType: "blob" });
  return { blob: response.data as Blob, filename: "danh_sach_phong.xlsx" };
};

export const createRoom = async (payload: RoomPayload): Promise<RoomApi> => {
  const response = await apiClient.post<ApiRoom>('/rooms', payload);
  return normalizeRoom(response.data);
};

export const updateRoom = async (roomId: number, payload: RoomPayload): Promise<RoomApi> => {
  const response = await apiClient.put<ApiRoom>(`/rooms/${roomId}`, payload);
  return normalizeRoom(response.data);
};

export const deleteRoom = async (roomId: number): Promise<void> => {
  await apiClient.delete(`/rooms/${roomId}`);
};

export const updateBedStatus = async (roomId: number, bedId: number, payload: BedPayload): Promise<RoomApi> => {
  const response = await apiClient.put<ApiRoom>(`/rooms/${roomId}/beds/${bedId}`, payload);
  return normalizeRoom(response.data);
};

export const transferBedOccupancy = async (
  roomId: number,
  bedId: number,
  payload: TransferBedPayload,
): Promise<RoomApi> => {
  const response = await apiClient.put<ApiRoom>(`/rooms/${roomId}/beds/${bedId}/transfer`, payload);
  return normalizeRoom(response.data);
};

// ----- Danh sách giường kèm thông tin sinh viên (GET /rooms/{roomId}/beds) -----

export type BedDetailStatus = "empty" | "reserved" | "occupied" | "maintenance";
export type BedDetailPhysicalStatus = "active" | "maintenance";
export type BedDetailPosition = "top" | "bottom";

export type BedStudent = {
  [key: string]: unknown;
  id: number;
  student_code: string;
  full_name: string;
  avatar: string | null;
  class_name: string | null;
  faculty: string | null;
  academic_status: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  course_year: string | number | null;
  permanent_address: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  occupancy?: {
    id: number;
    bed_id: number | null;
    room_id: number | null;
    check_in_date: string | null;
    check_out_date: string | null;
    status: string | null;
    checkout_request?: {
      expected_leave_date: string | null;
      reason: string | null;
    } | null;
  } | null;
  temporary_assignment?: {
    is_temporary: boolean;
    original_room_id: number | null;
    original_room_code: string | null;
    original_bed_id: number | null;
    original_bed_number: string | null;
    reason: string | null;
    transferred_at?: string | null;
    expected_return_date?: string | null;
    change_type?: "PERMANENT" | "TEMPORARY_MAINTENANCE" | "SWAP" | "ADMIN_TRANSFER" | null;
    maintenance_request_id: number | null;
  } | null;
};

export type BedDetail = {
  id: number;
  bed_number: string;
  position: BedDetailPosition;
  status: BedDetailPhysicalStatus;
  display_status: BedDetailStatus;
  occupied: boolean;
  student: BedStudent | null;
  transfer_history?: BedChangeHistory[];
  maintenance_history?: BedChangeHistory[];
  maintenance_assignment?: {
    occupancy_id: number | null;
    student_name: string;
    student_code: string;
    student_avatar?: string | null;
    temporary_bed_id: number | null;
    temporary_bed_number: string | null;
    transferred_at: string | null;
    expected_return_date: string | null;
    reason: string | null;
    maintenance_request_id: number | null;
    can_return: boolean;
  } | null;
};

export type BedChangeHistory = {
  id: number;
  student_name: string | null;
  student_code: string | null;
  old_room_code: string | null;
  old_bed_number: string | null;
  new_room_code: string | null;
  new_bed_number: string | null;
  reason: string | null;
  change_type: string | null;
  status: string | null;
  is_temporary: boolean;
  is_initial_assignment: boolean;
  transferred_at: string | null;
  completed_at: string | null;
  expected_return_date: string | null;
  maintenance_request_id: number | null;
};

export type RoomBedsResponse = {
  room_id: number;
  room_status: string;
  capacity: number;
  beds: BedDetail[];
};

const resolveAssetUrl = (value?: string | null): string | null => {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  const cleanPath = value.replace(/^\/+/, "").replace(/^(api\/|storage\/)/, "");
  return API_BASE.includes("railway.app")
    ? `${API_BASE}/api/storage/${cleanPath}`
    : `${API_BASE}/storage/${cleanPath}`;
};

type ApiBedStudent = Partial<BedStudent> & { avatar?: string | null };

type ApiBedDetail = {
  id: number;
  bed_number: number | string;
  position?: string | null;
  status?: string | null;
  display_status?: string | null;
  occupied?: boolean;
  student?: ApiBedStudent | null;
  transfer_history?: BedChangeHistory[];
  maintenance_history?: BedChangeHistory[];
  maintenance_assignment?: BedDetail["maintenance_assignment"];
};

type ApiRoomBedsResponse = {
  room_id: number;
  room_status?: string | null;
  capacity?: number;
  beds?: ApiBedDetail[];
};

const normalizeBedDetail = (bed: ApiBedDetail): BedDetail => {
  const status = String(bed.status ?? "active").toLowerCase();
  const physicalStatus: BedDetailPhysicalStatus = status === "maintenance" ? "maintenance" : "active";
  const position: BedDetailPosition =
    String(bed.position ?? "top").toLowerCase() === "bottom" ? "bottom" : "top";
  const rawStudent = bed.student ?? null;
  const rawDisplayStatus = String(bed.display_status ?? "").toLowerCase();
  const displayStatus: BedDetailStatus =
    rawDisplayStatus === "occupied" || rawDisplayStatus === "reserved" || rawDisplayStatus === "empty" || rawDisplayStatus === "maintenance"
      ? rawDisplayStatus
      : status === "occupied"
        ? "occupied"
        : physicalStatus === "maintenance"
          ? "maintenance"
          : rawStudent || bed.occupied
            ? "occupied"
            : "empty";

  return {
    id: bed.id,
    bed_number: String(bed.bed_number),
    position,
    status: physicalStatus,
    display_status: displayStatus,
    occupied: displayStatus === "occupied" || displayStatus === "reserved" || Boolean(bed.occupied),
    transfer_history: Array.isArray(bed.transfer_history) ? bed.transfer_history : [],
    maintenance_history: Array.isArray(bed.maintenance_history) ? bed.maintenance_history : [],
    maintenance_assignment: bed.maintenance_assignment
      ? {
          ...bed.maintenance_assignment,
          student_avatar: resolveAssetUrl(bed.maintenance_assignment.student_avatar ?? null),
        }
      : null,
    student: rawStudent
      ? {
          ...rawStudent,
          id: Number(rawStudent.id ?? 0),
          student_code: String(rawStudent.student_code ?? ""),
          full_name: String(rawStudent.full_name ?? ""),
          avatar: resolveAssetUrl(rawStudent.avatar ?? null),
          class_name: rawStudent.class_name ?? null,
          faculty: rawStudent.faculty ?? null,
          academic_status: rawStudent.academic_status ?? null,
          gender: rawStudent.gender ?? null,
          phone: rawStudent.phone ?? null,
          email: rawStudent.email ?? null,
          date_of_birth: rawStudent.date_of_birth ?? null,
          course_year: rawStudent.course_year ?? null,
          permanent_address: rawStudent.permanent_address ?? null,
          check_in_date: rawStudent.check_in_date ?? null,
          check_out_date: rawStudent.check_out_date ?? null,
          occupancy: rawStudent.occupancy ?? null,
          temporary_assignment: rawStudent.temporary_assignment ?? null,
        }
      : null,
  };
};

export const getRoomBeds = async (roomId: number): Promise<RoomBedsResponse> => {
  const response = await apiClient.get<ApiRoomBedsResponse>(`/rooms/${roomId}/beds`);
  const data = response.data;
  return {
    room_id: data.room_id,
    room_status: String(data.room_status ?? "ACTIVE").toUpperCase(),
    capacity: Number(data.capacity ?? 0) || 0,
    beds: Array.isArray(data.beds) ? data.beds.map(normalizeBedDetail) : [],
  };
};
