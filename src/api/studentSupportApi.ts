import apiClient from "../lib/apiClient";

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

export type StudentSupportRequest = {
  id: number;
  studentId: number;
  title: string;
  content: string;
  attachmentUrl: string;
  status: SupportRequestStatus;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
  student: SupportStudent | null;
};

export type CreateSupportRequestPayload = {
  title: string;
  content: string;
  attachment_url?: string;
};

type ApiSupportRequest = {
  id: number;
  student_id?: number | string | null;
  title?: string | null;
  content?: string | null;
  attachment_url?: string | null;
  status?: string | null;
  admin_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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

const statuses: SupportRequestStatus[] = ["pending", "processing", "approved", "rejected", "completed"];

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStatus = (value: string | null | undefined): SupportRequestStatus => {
  const normalized = (value ?? "pending").trim() as SupportRequestStatus;
  return statuses.includes(normalized) ? normalized : "pending";
};

const normalizeSupportRequest = (item: ApiSupportRequest): StudentSupportRequest => ({
  id: toNumber(item.id),
  studentId: toNumber(item.student_id),
  title: item.title ?? "",
  content: item.content ?? "",
  attachmentUrl: item.attachment_url ?? "",
  status: normalizeStatus(item.status),
  adminNote: item.admin_note ?? "",
  createdAt: item.created_at ?? "",
  updatedAt: item.updated_at ?? "",
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

// ── Admin ─────────────────────────────────────────────────────────────────────

export const listAdminSupportRequests = async (params?: {
  status?: SupportRequestStatus | "ALL";
  search?: string;
}): Promise<StudentSupportRequest[]> => {
  const response = await apiClient.get<ApiSupportRequest[]>("/admin/support-requests", {
    params: {
      status: params?.status && params.status !== "ALL" ? params.status : undefined,
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
