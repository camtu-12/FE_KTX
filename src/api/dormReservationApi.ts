import axios from "axios";
import apiClient from "../lib/apiClient";
import type { DormCapacitySummary } from "../types/dormCapacity";
export type { DormCapacitySummary } from "../types/dormCapacity";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const API_ROOT = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

// Public: dùng cho luồng tân sinh viên chưa có tài khoản (verify, tạo hồ sơ giữ chỗ,
// khai báo/upload minh chứng ưu tiên) — không được migrate sang apiClient (không có token).
export const API = axios.create({ baseURL: API_ROOT });

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReservationStatus =
  | "submitted"
  | "approved"
  | "rejected"
  | "waitlisted"
  | "converted"
  | "expired"
  | "cancelled";

export type ReservationProgress = {
  reservationCode: string | null;
  status: ReservationStatus;
  submittedAt: string | null;
  approvedAt?: string | null;
  periodName: string | null;
  periodEndDate?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  expirationReason?: string | null;
  canCancel?: boolean;
  registrationStatus?: string | null;
  registrationCancelledAt?: string | null;
  registrationCancellationReason?: string | null;
  candidate?: {
    fullName: string | null;
    majorName: string | null;
    maskedCccd: string | null;
    maskedEmail: string | null;
    maskedPhone: string | null;
  } | null;
};

type ApiReservationProgress = {
  reservation_code: string | null;
  status: ReservationStatus;
  submitted_at: string | null;
  approved_at?: string | null;
  period_name: string | null;
  period_end_date?: string | null;
  rejection_reason?: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  expiration_reason?: string | null;
  can_cancel?: boolean;
  registration_status?: string | null;
  registration_cancelled_at?: string | null;
  registration_cancellation_reason?: string | null;
  candidate?: {
    full_name: string | null;
    major_name: string | null;
    masked_cccd: string | null;
    masked_email: string | null;
    masked_phone: string | null;
  } | null;
};

function normalizeReservationProgress(d: ApiReservationProgress): ReservationProgress {
  return {
    reservationCode: d.reservation_code,
    status: d.status,
    submittedAt: d.submitted_at,
    approvedAt: d.approved_at ?? null,
    periodName: d.period_name,
    periodEndDate: d.period_end_date ?? null,
    rejectionReason: d.rejection_reason ?? null,
    cancellationReason: d.cancellation_reason ?? null,
    cancelledAt: d.cancelled_at ?? null,
    expirationReason: d.expiration_reason ?? null,
    canCancel: d.can_cancel ?? false,
    registrationStatus: d.registration_status ?? null,
    registrationCancelledAt: d.registration_cancelled_at ?? null,
    registrationCancellationReason: d.registration_cancellation_reason ?? null,
    candidate: d.candidate
      ? {
          fullName: d.candidate.full_name,
          majorName: d.candidate.major_name,
          maskedCccd: d.candidate.masked_cccd,
          maskedEmail: d.candidate.masked_email,
          maskedPhone: d.candidate.masked_phone,
        }
      : null,
  };
}

export type CandidateVerifyResult = {
  verificationStatus: "admitted" | "enrolled" | "cancelled" | "not_found" | "period_closed";
  message: string | null;
  fullName: string | null;
  majorName: string | null;
  courseYear: string | null;
  gender: string | null;
  existingReservation: ReservationProgress | null;
};

export type DormReservation = {
  id: number;
  admissionCandidateId: number;
  registrationPeriodId: number | null;
  reservationCode: string | null;
  studentCode: string | null;
  status: ReservationStatus;
  priorityNote: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  expirationReason: string | null;
  adminNote: string | null;
  avatarUrl: string | null;
  cccdFrontUrl: string | null;
  cccdBackUrl: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  expiresAt: string | null;
  convertedRegistrationId: number | null;
  convertedRegistration?: {
    status: string;
    cancelledAt: string | null;
    cancellationReason: string | null;
    cancelledBy: string | null;
  } | null;
  candidate?: {
    id: number;
    admissionCode: string;
    fullName: string;
    dateOfBirth: string;
    gender: string | null;
    cccd: string | null;
    phone: string | null;
    email: string | null;
    majorName: string | null;
    courseYear: string | null;
    schoolYear: string | null;
    status: string;
    studentId: number | null;
  };
  period?: {
    id: number;
    name: string;
    schoolYear: string | null;
    semester: string | null;
    status: string;
    endDate: string | null;
  } | null;
  reservationPriorities?: ReservationPriority[];
  hasPriorityEvidence: boolean;
  priorityEvidenceStatus: "pending" | "verified" | "rejected" | null;
  createdAt: string;
  updatedAt: string;
};

type ApiReservation = {
  id: number;
  admission_candidate_id: number;
  registration_period_id: number | null;
  reservation_code: string | null;
  student_code: string | null;
  status: ReservationStatus;
  priority_note: string | null;
  rejection_reason: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  expiration_reason?: string | null;
  admin_note: string | null;
  avatar_url: string | null;
  cccd_front_url: string | null;
  cccd_back_url: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  expires_at: string | null;
  converted_registration_id: number | null;
  converted_registration?: {
    status: string;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    cancelled_by: string | null;
  } | null;
  candidate?: {
    id: number;
    admission_code: string;
    full_name: string;
    date_of_birth: string;
    gender: string | null;
    cccd: string | null;
    phone: string | null;
    email: string | null;
    major_name: string | null;
    course_year: string | null;
    school_year: string | null;
    status: string;
    student_id: number | null;
  };
  period?: {
    id: number;
    name: string;
    school_year: string | null;
    semester: string | null;
    status: string;
    end_date: string | null;
  } | null;
  reservation_priorities?: ApiReservationPriority[];
  has_priority_evidence?: boolean;
  priority_evidence_status?: "pending" | "verified" | "rejected" | null;
  created_at: string;
  updated_at: string;
};

function normalizeReservation(r: ApiReservation): DormReservation {
  return {
    id: r.id,
    admissionCandidateId: r.admission_candidate_id,
    registrationPeriodId: r.registration_period_id,
    reservationCode: r.reservation_code,
    studentCode: r.student_code,
    status: r.status,
    priorityNote: r.priority_note,
    rejectionReason: r.rejection_reason,
    cancellationReason: r.cancellation_reason ?? null,
    cancelledAt: r.cancelled_at ?? null,
    cancelledBy: r.cancelled_by ?? null,
    expirationReason: r.expiration_reason ?? null,
    adminNote: r.admin_note,
    avatarUrl: r.avatar_url,
    cccdFrontUrl: r.cccd_front_url,
    cccdBackUrl: r.cccd_back_url,
    submittedAt: r.submitted_at,
    approvedAt: r.approved_at,
    expiresAt: r.expires_at,
    convertedRegistrationId: r.converted_registration_id,
    convertedRegistration: r.converted_registration
      ? {
          status: r.converted_registration.status,
          cancelledAt: r.converted_registration.cancelled_at ?? null,
          cancellationReason: r.converted_registration.cancellation_reason ?? null,
          cancelledBy: r.converted_registration.cancelled_by ?? null,
        }
      : null,
    candidate: r.candidate
      ? {
          id: r.candidate.id,
          admissionCode: r.candidate.admission_code,
          fullName: r.candidate.full_name,
          dateOfBirth: r.candidate.date_of_birth,
          gender: r.candidate.gender,
          cccd: r.candidate.cccd,
          phone: r.candidate.phone,
          email: r.candidate.email,
          majorName: r.candidate.major_name,
          courseYear: r.candidate.course_year,
          schoolYear: r.candidate.school_year,
          status: r.candidate.status,
          studentId: r.candidate.student_id,
        }
      : undefined,
    period: r.period
      ? {
          id: r.period.id,
          name: r.period.name,
          schoolYear: r.period.school_year,
          semester: r.period.semester,
          status: r.period.status,
          endDate: r.period.end_date ?? null,
        }
      : undefined,
    reservationPriorities: r.reservation_priorities?.map(normalizePriority),
    hasPriorityEvidence: r.has_priority_evidence ?? false,
    priorityEvidenceStatus: r.priority_evidence_status ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

type PaginatedResponse<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const verifyAdmissionCandidate = async (payload: {
  admission_code: string;
}): Promise<CandidateVerifyResult> => {
  const res = await API.post("/admission-candidates/verify", payload);
  const d = res.data as {
    verification_status: "admitted" | "enrolled" | "cancelled" | "not_found" | "period_closed";
    message?: string | null;
    full_name?: string | null;
    major_name?: string | null;
    course_year?: string | null;
    gender?: string | null;
    existing_reservation?: {
      reservation_code: string | null;
      status: ReservationStatus;
      submitted_at: string | null;
      period_name: string | null;
      period_end_date?: string | null;
    } | null;
  };
  return {
    verificationStatus: d.verification_status,
    message: d.message ?? null,
    fullName: d.full_name ?? null,
    majorName: d.major_name ?? null,
    courseYear: d.course_year ?? null,
    gender: d.gender ?? null,
    existingReservation: d.existing_reservation
      ? {
          reservationCode: d.existing_reservation.reservation_code,
          status: d.existing_reservation.status,
          submittedAt: d.existing_reservation.submitted_at,
          periodName: d.existing_reservation.period_name,
          periodEndDate: d.existing_reservation.period_end_date ?? null,
        }
      : null,
  };
};

export const lookupDormReservation = async (payload: {
  reservation_code: string;
}): Promise<{ message: string; reservation: ReservationProgress }> => {
  const res = await API.post("/dorm-reservations/lookup", payload);
  const d = res.data as { message: string; reservation: ApiReservationProgress };

  return {
    message: d.message,
    reservation: normalizeReservationProgress(d.reservation),
  };
};

/** Tự hủy nhu cầu ở KTX trước deadline — reservation_code là bằng chứng sở hữu, cùng quy
 * ước bảo mật với lookupDormReservation() (throttle riêng theo IP + mã ở backend). */
export const cancelDormReservationSelf = async (payload: {
  reservation_code: string;
  email: string;
  reason?: string;
}): Promise<{ message: string; reservation: ReservationProgress; promotedWaitlist: boolean }> => {
  const res = await API.post("/dorm-reservations/cancel", payload);
  const d = res.data as { message: string; reservation: ApiReservationProgress; promoted_waitlist: boolean };

  return {
    message: d.message,
    reservation: normalizeReservationProgress(d.reservation),
    promotedWaitlist: d.promoted_waitlist,
  };
};

export const createDormReservation = async (payload: {
  admission_code: string;
  registration_period_id: number;
  email?: string;
  priority_note?: string;
  father_name?: string;
  father_birth_year?: string;
  father_job?: string;
  father_phone?: string;
  mother_name?: string;
  mother_birth_year?: string;
  mother_job?: string;
  mother_phone?: string;
  parent_address?: string;
  commitment_confirm?: boolean;
}): Promise<{ message: string; reservation: DormReservation }> => {
  const res = await API.post("/dorm-reservations", payload);
  const d = res.data as {
    message: string;
    reservation: {
      id: number;
      reservation_code: string | null;
      status: ReservationStatus;
    };
  };
  return {
    message: d.message,
    reservation: {
      id: d.reservation.id,
      admissionCandidateId: 0,
      registrationPeriodId: null,
      reservationCode: d.reservation.reservation_code,
      studentCode: null,
      status: d.reservation.status,
      priorityNote: null,
      rejectionReason: null,
      cancellationReason: null,
      cancelledAt: null,
      cancelledBy: null,
      expirationReason: null,
      adminNote: null,
      avatarUrl: null,
      cccdFrontUrl: null,
      cccdBackUrl: null,
      submittedAt: null,
      approvedAt: null,
      expiresAt: null,
      convertedRegistrationId: null,
      convertedRegistration: null,
      hasPriorityEvidence: false,
      priorityEvidenceStatus: null,
      createdAt: "",
      updatedAt: "",
    },
  };
};

// ─── Admin API ────────────────────────────────────────────────────────────────

export const getAdminDormReservations = async (params?: {
  search?: string;
  status?: ReservationStatus | "";
  statuses?: ReservationStatus[];
  registration_status?: "cancelled" | "not_cancelled";
  registration_period_id?: number | "";
  expiration_reason?: string | "";
  priority_evidence_status?: "pending" | "verified" | "rejected" | "";
  page?: number;
}): Promise<PaginatedResponse<DormReservation>> => {
  const res = await apiClient.get("/admin/dorm-reservations", {
    params: {
      ...params,
      statuses: params?.statuses?.join(","),
    },
  });
  const raw = res.data as PaginatedResponse<ApiReservation>;
  return { ...raw, data: raw.data.map(normalizeReservation) };
};

export const getAdminDormReservation = async (id: number): Promise<DormReservation> => {
  const res = await apiClient.get(`/admin/dorm-reservations/${id}`);
  return normalizeReservation(res.data as ApiReservation);
};

export const getAdminDormReservationHistory = async (id: number): Promise<DormReservation[]> => {
  const res = await apiClient.get(`/admin/dorm-reservations/${id}/history`);
  const raw = res.data as { data: ApiReservation[] };
  return raw.data.map(normalizeReservation);
};

export const approveReservation = async (id: number, adminNote?: string): Promise<{ message: string; reservation: DormReservation }> => {
  const res = await apiClient.put(`/admin/dorm-reservations/${id}/approve`, { admin_note: adminNote });
  const d = res.data as { message: string; reservation: ApiReservation };
  return { message: d.message, reservation: normalizeReservation(d.reservation) };
};

export const rejectReservation = async (id: number, rejectionReason: string, adminNote?: string): Promise<{ message: string; reservation: DormReservation }> => {
  const res = await apiClient.put(`/admin/dorm-reservations/${id}/reject`, {
    rejection_reason: rejectionReason,
    admin_note: adminNote,
  });
  const d = res.data as { message: string; reservation: ApiReservation };
  return { message: d.message, reservation: normalizeReservation(d.reservation) };
};

export const waitlistReservation = async (id: number, adminNote?: string): Promise<{ message: string; reservation: DormReservation }> => {
  const res = await apiClient.put(`/admin/dorm-reservations/${id}/waitlist`, { admin_note: adminNote });
  const d = res.data as { message: string; reservation: ApiReservation };
  return { message: d.message, reservation: normalizeReservation(d.reservation) };
};

export const cancelReservation = async (id: number, reason: string, adminNote?: string): Promise<{ message: string; reservation: DormReservation }> => {
  const res = await apiClient.put(`/admin/dorm-reservations/${id}/cancel`, { reason, admin_note: adminNote });
  const d = res.data as { message: string; reservation: ApiReservation };
  return { message: d.message, reservation: normalizeReservation(d.reservation) };
};

export const updateReservationNote = async (id: number, adminNote: string): Promise<{ message: string; reservation: DormReservation }> => {
  const res = await apiClient.put(`/admin/dorm-reservations/${id}/note`, { admin_note: adminNote });
  const d = res.data as { message: string; reservation: ApiReservation };
  return { message: d.message, reservation: normalizeReservation(d.reservation) };
};

export const convertReservationToRegistration = async (
  id: number,
  registrationPeriodId?: number,
): Promise<{ message: string; registrationId: number; reservation: DormReservation }> => {
  const res = await apiClient.post(`/admin/dorm-reservations/${id}/convert-to-registration`, {
    registration_period_id: registrationPeriodId ?? null,
  });
  const d = res.data as { message: string; registration_id: number; reservation: ApiReservation };
  return { message: d.message, registrationId: d.registration_id, reservation: normalizeReservation(d.reservation) };
};

// ─── Reservation Priority Types ───────────────────────────────────────────────

export type ReservationPriorityStatus = "pending" | "verified" | "rejected";

export type ReservationPriorityEvidence = {
  id: number;
  fileUrl: string;
  originalName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
};

export type ReservationPriority = {
  id: number;
  dormReservationId: number;
  priorityCriteriaId: number;
  status: ReservationPriorityStatus;
  verifiedBy: number | null;
  verifiedAt: string | null;
  criteria?: {
    id: number;
    code: string | null;
    name: string;
    description: string | null;
    priorityScore: number;
    tier: number | null;
  };
  evidences?: ReservationPriorityEvidence[];
  createdAt: string;
  updatedAt: string;
};

type ApiReservationPriority = {
  id: number;
  dorm_reservation_id: number;
  priority_criteria_id: number;
  status: ReservationPriorityStatus;
  verified_by: number | null;
  verified_at: string | null;
  criteria?: {
    id: number;
    code?: string | null;
    name: string;
    description?: string | null;
    priority_score?: number;
    tier?: number | null;
  };
  evidences?: Array<{
    id: number;
    file_url: string;
    original_name: string | null;
    mime_type: string | null;
    file_size: number | null;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
};

function normalizePriority(r: ApiReservationPriority): ReservationPriority {
  return {
    id: r.id,
    dormReservationId: r.dorm_reservation_id,
    priorityCriteriaId: r.priority_criteria_id,
    status: r.status,
    verifiedBy: r.verified_by,
    verifiedAt: r.verified_at,
    criteria: r.criteria
      ? {
          id: r.criteria.id,
          code: r.criteria.code ?? null,
          name: r.criteria.name,
          description: r.criteria.description ?? null,
          priorityScore: r.criteria.priority_score ?? 0,
          tier: r.criteria.tier ?? null,
        }
      : undefined,
    evidences: r.evidences?.map((e) => ({
      id: e.id,
      fileUrl: e.file_url,
      originalName: e.original_name,
      mimeType: e.mime_type,
      fileSize: e.file_size,
      createdAt: e.created_at,
    })),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ─── Public — Priority Claims ─────────────────────────────────────────────────

export const claimReservationPriority = async (
  reservationId: number,
  reservationCode: string,
  priorityCriteriaId: number,
): Promise<{ message: string; priority: ReservationPriority }> => {
  const res = await API.post(`/dorm-reservations/${reservationId}/priorities`, {
    reservation_code: reservationCode,
    priority_criteria_id: priorityCriteriaId,
  });
  const d = res.data as { message: string; priority: ApiReservationPriority };
  return { message: d.message, priority: normalizePriority(d.priority) };
};

export const deleteReservationPriority = async (
  id: number,
  reservationCode: string,
): Promise<{ message: string }> => {
  const res = await API.delete(`/reservation-priorities/${id}`, {
    data: { reservation_code: reservationCode },
  });
  return res.data as { message: string };
};

export const uploadReservationDocument = async (
  reservationId: number,
  reservationCode: string,
  type: "avatar" | "cccd_front" | "cccd_back",
  file: File,
): Promise<{ message: string }> => {
  const form = new FormData();
  form.append("reservation_code", reservationCode);
  form.append("type", type);
  form.append("file", file);
  const res = await API.post(`/dorm-reservations/${reservationId}/upload-document`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as { message: string };
};

export const uploadReservationPriorityEvidence = async (
  priorityId: number,
  reservationCode: string,
  file: File,
): Promise<{ message: string }> => {
  const form = new FormData();
  form.append("reservation_code", reservationCode);
  form.append("file", file);
  const res = await API.post(`/reservation-priorities/${priorityId}/evidences`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as { message: string };
};

// ─── Admin — Priority Verification ───────────────────────────────────────────

export const getAdminReservationPriorities = async (params?: {
  status?: ReservationPriorityStatus | "";
  registration_period_id?: number | "";
  page?: number;
}): Promise<PaginatedResponse<ReservationPriority>> => {
  const res = await apiClient.get("/admin/reservation-priorities", { params });
  const raw = res.data as PaginatedResponse<ApiReservationPriority>;
  return { ...raw, data: raw.data.map(normalizePriority) };
};

export const verifyReservationPriority = async (
  id: number,
): Promise<{ message: string; priority: ReservationPriority }> => {
  const res = await apiClient.patch(`/admin/reservation-priorities/${id}/verify`);
  const d = res.data as { message: string; priority: ApiReservationPriority };
  return { message: d.message, priority: normalizePriority(d.priority) };
};

export const rejectReservationPriority = async (
  id: number,
): Promise<{ message: string; priority: ReservationPriority }> => {
  const res = await apiClient.patch(`/admin/reservation-priorities/${id}/reject`);
  const d = res.data as { message: string; priority: ApiReservationPriority };
  return { message: d.message, priority: normalizePriority(d.priority) };
};

// ─── Admin — Ranking & Batch Convert ─────────────────────────────────────────

export const rankDormReservations = async (
  registrationPeriodId: number,
): Promise<{
  message: string;
  free_beds: number;
  approved: number;
  waitlist: number;
  capacity?: DormCapacitySummary;
}> => {
  const res = await apiClient.post("/admin/dorm-reservations/rank", {
    registration_period_id: registrationPeriodId,
  });
  return res.data as {
    message: string;
    free_beds: number;
    approved: number;
    waitlist: number;
    capacity?: DormCapacitySummary;
  };
};

export const batchConvertReservations = async (
  registrationPeriodId: number,
): Promise<{
  message: string;
  converted: number;
  skipped: number;
  errors: Array<{ reservation_id: number; reservation_code: string; error: string }>;
}> => {
  const res = await apiClient.post("/admin/dorm-reservations/batch-convert", {
    registration_period_id: registrationPeriodId,
  });
  return res.data as {
    message: string;
    converted: number;
    skipped: number;
    errors: Array<{ reservation_id: number; reservation_code: string; error: string }>;
  };
};
