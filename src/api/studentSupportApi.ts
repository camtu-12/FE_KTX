import apiClient from "../lib/apiClient";

export type SupportRequestType =
  | "room_change"
  | "bed_change"
  | "roommate_request"
  | "complaint"
  | "suggestion"
  | "maintenance_report"
  | "other";
export type SupportRequestStatus = "pending" | "processing" | "approved" | "rejected" | "completed";

export type SupportStudent = {
  id: number;
  studentCode: string;
  fullName: string;
  email: string;
  phone: string;
  className: string;
  faculty: string;
};

export type SupportTargetRoom = {
  id: number;
  roomNumber: string;
  buildingCode: string;
  floorNumber: number;
};

export type SupportTargetBed = {
  id: number;
  bedNumber: string;
};

export type SupportTargetStudent = {
  id: number;
  fullName: string;
  studentCode: string;
  email: string;
};

export type RoommateTargetInfo = {
  student: {
    id: number;
    student_code: string;
    full_name: string;
    email: string;
  };
  room: {
    id: number;
    room_number: string;
    building_code: string;
    floor_number: number;
  };
  current_bed: {
    id: number;
    bed_number: string;
  } | null;
  available_beds: Array<{
    id: number;
    bed_number: string;
  }>;
};

export type StudentSupportRequest = {
  id: number;
  studentId: number;
  requestType: SupportRequestType;
  title: string;
  content: string;
  attachmentUrl: string;
  status: SupportRequestStatus;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
  student: SupportStudent | null;
  targetRoomId: number | null;
  targetBedId: number | null;
  targetStudentId: number | null;
  targetRoom: SupportTargetRoom | null;
  targetBed: SupportTargetBed | null;
  targetStudent: SupportTargetStudent | null;
};

export type CreateSupportRequestPayload = {
  request_type: SupportRequestType;
  title: string;
  content: string;
  attachment_url?: string;
  target_room_id?: number | null;
  target_bed_id?: number | null;
  target_student_id?: number | null;
};

type ApiSupportRequest = {
  id: number;
  student_id?: number | string | null;
  request_type?: string | null;
  title?: string | null;
  content?: string | null;
  attachment_url?: string | null;
  status?: string | null;
  admin_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  target_room_id?: number | null;
  target_bed_id?: number | null;
  target_student_id?: number | null;
  target_room?: {
    id?: number;
    room_number?: string | number;
    building_code?: string;
    floor_number?: number;
  } | null;
  target_bed?: {
    id?: number;
    bed_number?: string | number;
  } | null;
  target_student?: {
    id?: number;
    full_name?: string;
    student_code?: string;
    email?: string;
  } | null;
  student?: {
    id?: number | string | null;
    student_code?: string | null;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    class_name?: string | null;
    faculty?: string | null;
  } | null;
};

const requestTypes: SupportRequestType[] = [
  "room_change",
  "bed_change",
  "roommate_request",
  "complaint",
  "suggestion",
  "maintenance_report",
  "other",
];
const statuses: SupportRequestStatus[] = ["pending", "processing", "approved", "rejected", "completed"];

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeRequestType = (value: string | null | undefined): SupportRequestType => {
  const normalized = (value ?? "other").trim() as SupportRequestType;
  return requestTypes.includes(normalized) ? normalized : "other";
};

const normalizeStatus = (value: string | null | undefined): SupportRequestStatus => {
  const normalized = (value ?? "pending").trim() as SupportRequestStatus;
  return statuses.includes(normalized) ? normalized : "pending";
};

const normalizeSupportRequest = (item: ApiSupportRequest): StudentSupportRequest => ({
  id: toNumber(item.id),
  studentId: toNumber(item.student_id),
  requestType: normalizeRequestType(item.request_type),
  title: item.title ?? "",
  content: item.content ?? "",
  attachmentUrl: item.attachment_url ?? "",
  status: normalizeStatus(item.status),
  adminNote: item.admin_note ?? "",
  createdAt: item.created_at ?? "",
  updatedAt: item.updated_at ?? "",
  targetRoomId: item.target_room_id ?? null,
  targetBedId: item.target_bed_id ?? null,
  targetStudentId: item.target_student_id ?? null,
  targetRoom: item.target_room
    ? {
        id: item.target_room.id ?? 0,
        roomNumber: String(item.target_room.room_number ?? ""),
        buildingCode: item.target_room.building_code ?? "",
        floorNumber: item.target_room.floor_number ?? 0,
      }
    : null,
  targetBed: item.target_bed
    ? {
        id: item.target_bed.id ?? 0,
        bedNumber: String(item.target_bed.bed_number ?? ""),
      }
    : null,
  targetStudent: item.target_student
    ? {
        id: item.target_student.id ?? 0,
        fullName: item.target_student.full_name ?? "",
        studentCode: item.target_student.student_code ?? "",
        email: item.target_student.email ?? "",
      }
    : null,
  student: item.student
    ? {
        id: toNumber(item.student.id),
        studentCode: item.student.student_code ?? "",
        fullName: item.student.full_name ?? "",
        email: item.student.email ?? "",
        phone: item.student.phone ?? "",
        className: item.student.class_name ?? "",
        faculty: item.student.faculty ?? "",
      }
    : null,
});

// ── Student ──────────────────────────────────────────────────────────────────

export const listMySupportRequests = async (): Promise<StudentSupportRequest[]> => {
  const response = await apiClient.get<ApiSupportRequest[]>("/student/support-requests");
  return Array.isArray(response.data) ? response.data.map(normalizeSupportRequest) : [];
};

export const getMySupportRequest = async (id: number): Promise<StudentSupportRequest> => {
  const response = await apiClient.get<ApiSupportRequest>(`/student/support-requests/${id}`);
  return normalizeSupportRequest(response.data);
};

export const createSupportRequest = async (payload: CreateSupportRequestPayload): Promise<StudentSupportRequest> => {
  const response = await apiClient.post<ApiSupportRequest>("/student/support-requests", payload);
  return normalizeSupportRequest(response.data);
};

export const getRoommateTargetInfo = async (studentCode: string): Promise<RoommateTargetInfo> => {
  const response = await apiClient.get<RoommateTargetInfo>("/student/support-requests/roommate-target", {
    params: { student_code: studentCode },
  });
  return response.data;
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const listAdminSupportRequests = async (params?: {
  status?: SupportRequestStatus | "ALL";
  request_type?: SupportRequestType | "ALL";
  search?: string;
}): Promise<StudentSupportRequest[]> => {
  const response = await apiClient.get<ApiSupportRequest[]>("/admin/support-requests", {
    params: {
      status: params?.status && params.status !== "ALL" ? params.status : undefined,
      request_type: params?.request_type && params.request_type !== "ALL" ? params.request_type : undefined,
      search: params?.search || undefined,
    },
  });
  return Array.isArray(response.data) ? response.data.map(normalizeSupportRequest) : [];
};

export const processSupportRequest = async (
  id: number,
  action: "process" | "approve" | "reject" | "complete",
  payload: { admin_note?: string },
): Promise<StudentSupportRequest> => {
  const response = await apiClient.put<ApiSupportRequest>(`/admin/support-requests/${id}/${action}`, payload);
  return normalizeSupportRequest(response.data);
};

export const approveSupportRequest = async (
  id: number,
  payload?: { admin_note?: string },
): Promise<StudentSupportRequest> => {
  const response = await apiClient.put<ApiSupportRequest>(`/admin/support-requests/${id}/approve`, payload ?? {});
  return normalizeSupportRequest(response.data);
};

export const updateAdminSupportRequestStatus = async (
  id: number,
  payload: { status: Exclude<SupportRequestStatus, "approved">; admin_note?: string },
): Promise<StudentSupportRequest> => {
  const response = await apiClient.put<ApiSupportRequest>(`/admin/support-requests/${id}/status`, payload);
  return normalizeSupportRequest(response.data);
};
