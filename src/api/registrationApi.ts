import axios from "axios";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

// Ensure we don't end up with /api/api if the env already contains /api
const API_ROOT = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

export const API = axios.create({
  baseURL: API_ROOT, // BE Laravel root (robust to env value)
});

// ================== LẤY ==================
export type EligibilityResult = {
  eligible: boolean;
  reason_code?: string;
  academic_status?: string;
  reason_message?: string;
  redirect?: string;
  channel_info?: {
    channel: 'main' | 'rolling';
    period_name: string;
    school_year: string;
    semester: string;
    start_date: string;
    end_date: string;
    stay_start_date: string | null;
    stay_end_date: string | null;
    status: string;
  };
};

export const checkEligibility = (email: string): Promise<EligibilityResult> =>
  API.get('/registration/eligibility', { params: { email } }).then((res) => res.data as EligibilityResult);

export const getMyRegistration = (email: string) => {
  return API.get(`/registration/me`, {
    params: { email },
  }).then((res) => res.data);
};

export const getRegistrationHistory = (email: string, semester: string) => {
  return API.get(`/registration/history/${email}/${semester}`).then((res) => res.data);
};

// ================== GỬI ==================
export const submitRegistration = (formData: FormData) => {
  return API.post(`/registration`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  }).then((res) => res.data);
};

export const getRegistrationById = (id: number) => {
  return API.get(`/registration/${id}`).then((res) => res.data);
};

export const approveRegistration = (id: number) => {
  return API.put(`/registration/${id}/approve`).then((res) => res.data);
};

export const rejectRegistration = (id: number, rejectionReason: string) => {
  return API.put(`/registration/${id}/reject`, { rejectionReason }).then((res) => res.data);
};

export const assignRoom = (id: number, roomId: number) => {
  return API.put(`/registration/${id}/assign-room`, { room_id: roomId }).then((res) => res.data);
};

export const getRegistrations = () => {
  return API.get("/registration").then((res) => res.data);
};
export const getRooms = () => {
  return API.get("/rooms").then((res) => res.data);
};

export const selectBed = (email: string, bedId: number): Promise<{ message: string; bill_id: number | null }> => {
  return API.put("/registration/select-bed", {
    email,
    bed_id: bedId,
  }).then((res) => res.data as { message: string; bill_id: number | null });
};

export const approveBedSelection = (id: number) => {
  return API.put(`/registration/${id}/approve-bed`).then((res) => res.data);
};

export const rejectBedSelection = (id: number) => {
  return API.put(`/registration/${id}/reject-bed`).then((res) => res.data);
};

export const requestCheckout = (email: string, reason: string, expectedLeaveDate?: string) => {
  return API.put("/registration/request-checkout", {
    email,
    reason,
    expected_leave_date: expectedLeaveDate || null,
  }).then((res) => res.data);
};

export const confirmCheckout = (id: number) => {
  return API.put(`/registration/${id}/confirm-checkout`).then((res) => res.data);
};

export const forceCheckout = (id: number, reason: string) => {
  return API.put(`/registration/${id}/force-checkout`, { reason }).then((res) => res.data);
};

export const getPriorityCriteria = () => {
  return API.get("/priority-criteria").then((res) => res.data);
};

// ================== ĐỢT ĐĂNG KÝ ==================
export type RegistrationPeriodPayload = {
  name: string;
  period_type?: "registration" | "extension";
  channel?: "main" | "rolling";
  status?: "pending" | "active" | "closed" | "processing";
  school_year?: string;
  semester?: string;
  start_date: string;
  end_date: string;
  stay_start_date?: string | null;
  stay_end_date?: string | null;
  bed_selection_days?: number | null;
  processing_days?: number | null;
  initial_payment_due_days?: number | null;
  round_number?: number | null;
  allow_admission_candidates?: boolean;
  requires_student_code?: boolean;
};

export type RegistrationPeriodData = RegistrationPeriodPayload & {
  id: number;
  period_type: "registration" | "extension";
  registrations_count?: number;
  approved_count?: number;
  rejected_count?: number;
  approve_proposal_count?: number;
  reject_proposal_count?: number;
  review_count?: number;
  pending_criteria_count?: number;
  allow_admission_candidates?: boolean;
  requires_student_code?: boolean;
  round_number?: number | null;
  created_at?: string;
  updated_at?: string;
};

export const getRegistrationPeriods = (): Promise<RegistrationPeriodData[]> =>
  API.get("/registration-periods").then((res) => res.data as RegistrationPeriodData[]);

export const createRegistrationPeriod = (payload: RegistrationPeriodPayload): Promise<RegistrationPeriodData> =>
  API.post("/registration-periods", payload).then((res) => res.data as RegistrationPeriodData);

export const updateRegistrationPeriod = (id: number, payload: Partial<RegistrationPeriodPayload>): Promise<RegistrationPeriodData> =>
  API.put(`/registration-periods/${id}`, payload).then((res) => res.data as RegistrationPeriodData);

export const deleteRegistrationPeriod = (id: number): Promise<void> =>
  API.delete(`/registration-periods/${id}`).then(() => undefined);

export const processRegistrationPeriod = (id: number): Promise<{ message: string; free_beds: number; approved: number; waitlist: number }> =>
  API.post(`/registration-periods/${id}/process`).then((res) => res.data);

export const patchAutoDecision = (id: number, decision: 'approve' | 'reject' | 'review', reason?: string) =>
  API.patch(`/admin/registrations/${id}/auto-decision`, { decision, reason }).then((res) => res.data);

export const confirmSingle = (id: number) =>
  API.post(`/admin/registrations/${id}/confirm`).then((res) => res.data);

export const confirmBatch = (periodId: number): Promise<{ confirmed: number; skipped_review: number; skipped_null: number }> =>
  API.post(`/admin/registration-periods/${periodId}/confirm-batch`).then((res) => res.data);

export type AutoAssignResult = {
  message: string;
  assigned: number;
  no_room: number;
  details: Array<{ registration_id: number; student_code: string; name: string; result: string; room_id?: number; room_name?: string }>;
};

export const autoAssignRooms = (registrationPeriodId?: number): Promise<AutoAssignResult> =>
  API.post('/admin/rooms/auto-assign', registrationPeriodId ? { registration_period_id: registrationPeriodId } : {}).then((res) => res.data as AutoAssignResult);

export type ConfirmProposalsResult = {
  message: string;
  confirmed: number;
  notifications: Array<{ student_code: string; student_name: string; room_id: number; room_name: string; message: string }>;
};

export const confirmRoomProposals = (registrationPeriodId?: number): Promise<ConfirmProposalsResult> =>
  API.post('/admin/rooms/confirm-proposals', registrationPeriodId ? { registration_period_id: registrationPeriodId } : {}).then((res) => res.data as ConfirmProposalsResult);
