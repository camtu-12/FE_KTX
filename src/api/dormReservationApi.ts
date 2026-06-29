import axios from "axios";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const API_ROOT = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

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

export type CandidateVerifyResult = {
  id: number;
  admissionCode: string;
  fullName: string;
  dateOfBirth: string;
  majorName: string | null;
  courseYear: string | null;
  schoolYear: string | null;
  gender: string | null;
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
  adminNote: string | null;
  avatarUrl: string | null;
  cccdFrontUrl: string | null;
  cccdBackUrl: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  expiresAt: string | null;
  convertedRegistrationId: number | null;
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
  } | null;
  reservationPriorities?: ReservationPriority[];
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
  admin_note: string | null;
  avatar_url: string | null;
  cccd_front_url: string | null;
  cccd_back_url: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  expires_at: string | null;
  converted_registration_id: number | null;
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
  } | null;
  reservation_priorities?: ApiReservationPriority[];
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
    adminNote: r.admin_note,
    avatarUrl: r.avatar_url,
    cccdFrontUrl: r.cccd_front_url,
    cccdBackUrl: r.cccd_back_url,
    submittedAt: r.submitted_at,
    approvedAt: r.approved_at,
    expiresAt: r.expires_at,
    convertedRegistrationId: r.converted_registration_id,
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
        }
      : undefined,
    reservationPriorities: r.reservation_priorities?.map(normalizePriority),
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
  date_of_birth?: string;
  cccd?: string;
}): Promise<CandidateVerifyResult> => {
  const res = await API.post("/admission-candidates/verify", payload);
  const d = res.data as {
    id: number;
    admission_code: string;
    full_name: string;
    date_of_birth: string;
    major_name: string | null;
    course_year: string | null;
    school_year: string | null;
    gender: string | null;
  };
  return {
    id: d.id,
    admissionCode: d.admission_code,
    fullName: d.full_name,
    dateOfBirth: d.date_of_birth,
    majorName: d.major_name,
    courseYear: d.course_year,
    schoolYear: d.school_year,
    gender: d.gender,
  };
};

export const createDormReservation = async (payload: {
  admission_code: string;
  date_of_birth?: string;
  cccd?: string;
  registration_period_id: number;
  phone?: string;
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
  const d = res.data as { message: string; reservation: ApiReservation };
  return { message: d.message, reservation: normalizeReservation(d.reservation) };
};

// ─── Admin API ────────────────────────────────────────────────────────────────

export const getAdminDormReservations = async (params?: {
  search?: string;
  status?: ReservationStatus | "";
  registration_period_id?: number | "";
  page?: number;
}): Promise<PaginatedResponse<DormReservation>> => {
  const res = await API.get("/admin/dorm-reservations", { params });
  const raw = res.data as PaginatedResponse<ApiReservation>;
  return { ...raw, data: raw.data.map(normalizeReservation) };
};

export const getAdminDormReservation = async (id: number): Promise<DormReservation> => {
  const res = await API.get(`/admin/dorm-reservations/${id}`);
  return normalizeReservation(res.data as ApiReservation);
};

export const approveReservation = async (id: number, adminNote?: string): Promise<{ message: string; reservation: DormReservation }> => {
  const res = await API.put(`/admin/dorm-reservations/${id}/approve`, { admin_note: adminNote });
  const d = res.data as { message: string; reservation: ApiReservation };
  return { message: d.message, reservation: normalizeReservation(d.reservation) };
};

export const rejectReservation = async (id: number, rejectionReason: string, adminNote?: string): Promise<{ message: string; reservation: DormReservation }> => {
  const res = await API.put(`/admin/dorm-reservations/${id}/reject`, {
    rejection_reason: rejectionReason,
    admin_note: adminNote,
  });
  const d = res.data as { message: string; reservation: ApiReservation };
  return { message: d.message, reservation: normalizeReservation(d.reservation) };
};

export const waitlistReservation = async (id: number, adminNote?: string): Promise<{ message: string; reservation: DormReservation }> => {
  const res = await API.put(`/admin/dorm-reservations/${id}/waitlist`, { admin_note: adminNote });
  const d = res.data as { message: string; reservation: ApiReservation };
  return { message: d.message, reservation: normalizeReservation(d.reservation) };
};

export const cancelReservation = async (id: number, adminNote?: string): Promise<{ message: string; reservation: DormReservation }> => {
  const res = await API.put(`/admin/dorm-reservations/${id}/cancel`, { admin_note: adminNote });
  const d = res.data as { message: string; reservation: ApiReservation };
  return { message: d.message, reservation: normalizeReservation(d.reservation) };
};

export const updateReservationNote = async (id: number, adminNote: string): Promise<{ message: string; reservation: DormReservation }> => {
  const res = await API.put(`/admin/dorm-reservations/${id}/note`, { admin_note: adminNote });
  const d = res.data as { message: string; reservation: ApiReservation };
  return { message: d.message, reservation: normalizeReservation(d.reservation) };
};

export const convertReservationToRegistration = async (
  id: number,
  registrationPeriodId?: number,
): Promise<{ message: string; registrationId: number; reservation: DormReservation }> => {
  const res = await API.post(`/admin/dorm-reservations/${id}/convert-to-registration`, {
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
    code: string | null;
    name: string;
    description: string | null;
    priority_score: number;
    tier: number | null;
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
          code: r.criteria.code,
          name: r.criteria.name,
          description: r.criteria.description,
          priorityScore: r.criteria.priority_score,
          tier: r.criteria.tier,
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
): Promise<{ message: string; url: string }> => {
  const form = new FormData();
  form.append("reservation_code", reservationCode);
  form.append("type", type);
  form.append("file", file);
  const res = await API.post(`/dorm-reservations/${reservationId}/upload-document`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as { message: string; url: string };
};

export const uploadReservationPriorityEvidence = async (
  priorityId: number,
  reservationCode: string,
  file: File,
): Promise<{ message: string; evidence: ReservationPriorityEvidence }> => {
  const form = new FormData();
  form.append("reservation_code", reservationCode);
  form.append("file", file);
  const res = await API.post(`/reservation-priorities/${priorityId}/evidences`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const d = res.data as {
    message: string;
    evidence: { id: number; file_url: string; original_name: string | null; mime_type: string | null; file_size: number | null; created_at: string };
  };
  return {
    message: d.message,
    evidence: {
      id: d.evidence.id,
      fileUrl: d.evidence.file_url,
      originalName: d.evidence.original_name,
      mimeType: d.evidence.mime_type,
      fileSize: d.evidence.file_size,
      createdAt: d.evidence.created_at,
    },
  };
};

// ─── Admin — Priority Verification ───────────────────────────────────────────

export const getAdminReservationPriorities = async (params?: {
  status?: ReservationPriorityStatus | "";
  registration_period_id?: number | "";
  page?: number;
}): Promise<PaginatedResponse<ReservationPriority>> => {
  const res = await API.get("/admin/reservation-priorities", { params });
  const raw = res.data as PaginatedResponse<ApiReservationPriority>;
  return { ...raw, data: raw.data.map(normalizePriority) };
};

export const verifyReservationPriority = async (
  id: number,
): Promise<{ message: string; priority: ReservationPriority }> => {
  const res = await API.patch(`/admin/reservation-priorities/${id}/verify`);
  const d = res.data as { message: string; priority: ApiReservationPriority };
  return { message: d.message, priority: normalizePriority(d.priority) };
};

export const rejectReservationPriority = async (
  id: number,
): Promise<{ message: string; priority: ReservationPriority }> => {
  const res = await API.patch(`/admin/reservation-priorities/${id}/reject`);
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
  pending_priority_count: number;
}> => {
  const res = await API.post("/admin/dorm-reservations/rank", {
    registration_period_id: registrationPeriodId,
  });
  return res.data as {
    message: string;
    free_beds: number;
    approved: number;
    waitlist: number;
    pending_priority_count: number;
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
  const res = await API.post("/admin/dorm-reservations/batch-convert", {
    registration_period_id: registrationPeriodId,
  });
  return res.data as {
    message: string;
    converted: number;
    skipped: number;
    errors: Array<{ reservation_id: number; reservation_code: string; error: string }>;
  };
};
