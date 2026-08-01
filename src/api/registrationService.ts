import * as regApi from "./registrationApi";
import apiClient from "../lib/apiClient";
import {
  getDormBedPairsForRoomInstant,
  getDormBedsForRoomInstant,
  getDormRoomsInstant,
} from "../mocks/dormRoomStore.ts";
import type { DormRoom } from "../types/dormRoom.ts";
import { listRooms, type RoomApi } from "./roomApi";
import type {
  RegistrationFormData,
  RegistrationRequest,
  RegistrationStatus,
} from "../modules/admin/data/registrationRequests";
import {
  dispatchRegistrationRequestsUpdated,
} from "../modules/admin/data/registrationRequests";

// Sử dụng Railway URL từ environment variables (có fallback nếu biến không được set)
const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) || "http://127.0.0.1:8000").replace(/\/+$/, "");


console.log("API_BASE:", API_BASE); // Debug - kiểm tra URL đúng không

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => typeof value === "object" && value !== null;

const isBrowser = () => typeof window !== "undefined";

const dispatchRoomsUpdated = () => {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event("ktx-rooms-updated"));
};

const extract = <T>(res: unknown): T => {
  if (!isRecord(res)) {
    return res as T;
  }

  if (Object.prototype.hasOwnProperty.call(res, "data")) {
    return (res as { data: T }).data;
  }

  return res as T;
};

const createPreviewSvg = (title: string, subtitle: string, accent: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f8fbff"/>
          <stop offset="100%" stop-color="#dbe9ff"/>
        </linearGradient>
      </defs>
      <rect width="640" height="480" rx="36" fill="url(#bg)"/>
      <rect x="36" y="36" width="568" height="408" rx="28" fill="#ffffff" stroke="#cddcf3" stroke-width="4"/>
      <rect x="72" y="76" width="496" height="132" rx="24" fill="${accent}" opacity="0.12"/>
      <text x="320" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#1f3152">${title}</text>
      <text x="320" y="196" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#5c7094">${subtitle}</text>
      <rect x="120" y="256" width="400" height="108" rx="24" fill="#eef4ff" stroke="#d8e4f5" stroke-width="3"/>
      <text x="320" y="318" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="600" fill="#244cb8">Bản xem hồ sơ đã nộp</text>
    </svg>`,
  )}`;

const toPublicAssetUrl = (value?: string | null) => {
  if (!value) return "";
  
  // If it's already a full URL, return it as-is (backend already did the work)
  if (value.includes('http://') || value.includes('https://')) {
    return value;
  }
  
  // Handle data URLs
  if (value.startsWith('data:')) {
    return value;
  }

  // Only build URLs for relative paths
  const normalized = String(value).replace(/^\/+/, "");
  // Strip optional 'api/' prefix AND 'storage/' prefix together
  const cleanPath = normalized.replace(/^(?:api\/)?storage\//, "");
  
  // Local development
  if (!API_BASE.includes('railway.app')) {
    return `${API_BASE}/storage/${cleanPath}`;
  }
  
  // Railway - use /api/storage/
  return `${API_BASE}/api/storage/${cleanPath}`;
};

const normalizeStatus = (value: unknown): RegistrationStatus => {
  if (value === "approved" || value === "rejected" || value === "submitted" || value === "cancelled") {
    return value;
  }

  return "submitted";
};

const normalizeBedApprovalStatus = (value: unknown): RegistrationRequest["bed_approval_status"] => {
  if (value === "approved" || value === "rejected" || value === "pending") {
    return value;
  }

  return null;
};

const firstDefinedString = (...values: unknown[]) => {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }

    const text = String(value).trim();
    if (text) {
      return text;
    }
  }

  return "";
};

const readRecord = (...values: unknown[]): JsonRecord | null => {
  for (const value of values) {
    if (isRecord(value)) {
      return value;
    }
  }

  return null;
};

const toNumberOrNull = (value: unknown) => {
  const text = firstDefinedString(value);
  if (!text) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeRegistrationRequest = (raw: unknown): RegistrationRequest | null => {
  const rawRecord = isRecord(raw) ? raw : null;
  const dataRecord = readRecord(rawRecord?.data);
  const registration = readRecord(rawRecord?.registration, dataRecord?.registration, dataRecord, rawRecord);

  if (!registration) {
    return null;
  }

  const isRegistrationLike =
    "id" in registration ||
    "status" in registration ||
    "semester" in registration ||
    "student_id" in registration ||
    "cccd_front_url" in registration ||
    "cccd_back_url" in registration;

  if (!isRegistrationLike) {
    return null;
  }

  const student = readRecord(rawRecord?.student, dataRecord?.student, registration.student) ?? {};
  const account = readRecord(student.account, rawRecord?.account, dataRecord?.account, registration.account) ?? {};
  const existingFormData = readRecord(registration.formData, rawRecord?.formData, dataRecord?.formData) ?? {};
  const registrationPeriod = readRecord(
    registration.registration_period,
    registration.period,
    rawRecord?.registration_period,
    rawRecord?.period,
    dataRecord?.registration_period,
    dataRecord?.period,
  ) ?? {};

  const studentCode = firstDefinedString(existingFormData.mssv, account.student_code, student.student_code);
  const fullName = firstDefinedString(existingFormData.fullName, account.full_name, student.full_name);
  const birthDate = firstDefinedString(
    existingFormData.birthDate,
    registration.birthDate,
    registration.date_of_birth,
    registration.dateOfBirth,
    student.date_of_birth,
    student.birth_date,
  );
  const gender = firstDefinedString(existingFormData.gender, registration.gender, student.gender);
  const className = firstDefinedString(existingFormData.class, registration.class, student.class_name, student.class);
  const department = firstDefinedString(existingFormData.department, registration.department, student.faculty, student.department);
  const nationality = firstDefinedString(existingFormData.nationality, registration.nationality, student.nationality);
  const ethnicity = firstDefinedString(existingFormData.ethnicity, registration.ethnicity, student.ethnicity);
  const religion = firstDefinedString(existingFormData.religion, registration.religion, student.religion);
  const phone = firstDefinedString(existingFormData.phone, registration.phone, student.phone);
  const cccd = firstDefinedString(existingFormData.cccd, registration.cccd, student.cccd);
  const cccdIssueDate = firstDefinedString(
    existingFormData.cccdIssueDate,
    registration.cccdIssueDate,
    registration.cccd_issued_date,
    registration.cccdIssuedDate,
    student.cccd_issued_date,
  );
  const cccdIssuePlace = firstDefinedString(
    existingFormData.cccdIssuePlace,
    registration.cccdIssuePlace,
    registration.cccd_issued_place,
    registration.cccdIssuedPlace,
    student.cccd_issued_place,
  );
  const address = firstDefinedString(existingFormData.address, registration.address, student.permanent_address, student.address);
  const fatherName = firstDefinedString(existingFormData.father_name, registration.father_name, student.father_name);
  const fatherBirthYear = firstDefinedString(existingFormData.father_birth_year, registration.father_birth_year, student.father_birth_year);
  const fatherPhone = firstDefinedString(existingFormData.father_phone, registration.father_phone, student.father_phone);
  const fatherJob = firstDefinedString(existingFormData.father_job, registration.father_job, student.father_job);
  const motherName = firstDefinedString(existingFormData.mother_name, registration.mother_name, student.mother_name);
  const motherBirthYear = firstDefinedString(existingFormData.mother_birth_year, registration.mother_birth_year, student.mother_birth_year);
  const motherPhone = firstDefinedString(existingFormData.mother_phone, registration.mother_phone, student.mother_phone);
  const motherJob = firstDefinedString(existingFormData.mother_job, registration.mother_job, student.mother_job);
  const familyContactAddress = firstDefinedString(
    existingFormData.familyContactAddress,
    registration.familyContactAddress,
    registration.parent_address,
    student.parent_address,
  );
  // registration.parent_name/parent_phone/parent_relationship chưa từng tồn tại làm cột
  // thật trên registrations (bug cũ) — đọc đúng emergency_contact_* mới, parent_* giữ lại
  // cuối danh sách chỉ để tương thích ngược nếu có bản ghi cũ nào đó từng có giá trị này.
  const relationName = firstDefinedString(existingFormData.relationName, registration.emergency_contact_name, student.emergency_contact_name, registration.parent_name, student.parent_name);
  const relationPhone = firstDefinedString(existingFormData.relationPhone, registration.emergency_contact_phone, student.emergency_contact_phone, registration.parent_phone, student.parent_phone);
  const relationship = firstDefinedString(existingFormData.relationship, registration.emergency_contact_relationship, student.emergency_contact_relationship, registration.parent_relationship, student.parent_relationship, "parent");
  const dormStartDate = firstDefinedString(existingFormData.dormStartDate, registration.stay_from_date, registration.dormStartDate);
  const dormEndDate = firstDefinedString(existingFormData.dormEndDate, registration.stay_to_date, registration.dormEndDate);

  const formData: RegistrationFormData = {
    mssv: studentCode,
    fullName,
    birthDate,
    gender,
    class: className,
    department,
    nationality,
    ethnicity,
    religion,
    phone,
    cccd,
    cccdIssueDate,
    cccdIssuePlace,
    address,
    father_name: fatherName,
    father_birth_year: fatherBirthYear,
    father_phone: fatherPhone,
    father_job: fatherJob,
    mother_name: motherName,
    mother_birth_year: motherBirthYear,
    mother_phone: motherPhone,
    mother_job: motherJob,
    familyContactAddress,
    relationName: relationName || fatherName,
    relationPhone: relationPhone || fatherPhone,
    relationship,
    dormStartDate,
    dormEndDate,
  };

  const baseTitle = studentCode || fullName || "Sinh viên";
  const documents = readRecord(registration.documents, rawRecord?.documents, dataRecord?.documents) ?? {};

  // Ưu tiên tài sản tải lên thật; không tự tạo ảnh xem trước/mô phỏng ở đây.
  // Ưu tiên ảnh được nộp kèm trong hồ sơ (`documents.portraitPhoto`) trước,
  // sau đó mới tới avatar hiện tại của student nếu có.
  const portraitPhotoUrl = toPublicAssetUrl(
    firstDefinedString(documents.portraitPhoto, registration.avatarUrl, registration.avatar_url, registration.avatar, student.avatar, documents.avatar),
  );
  const cccdFrontPhotoUrl = toPublicAssetUrl(
    firstDefinedString(registration.cccd_front_url, documents.cccdFrontPhoto, documents.cccdFrontUrl),
  );
  const cccdBackPhotoUrl = toPublicAssetUrl(
    firstDefinedString(registration.cccd_back_url, documents.cccdBackPhoto, documents.cccdBackUrl),
  );

  const portraitPhoto =
    toPublicAssetUrl(firstDefinedString(documents.portraitPhoto, student.avatar)) ||
    createPreviewSvg("Ảnh thẻ", baseTitle, "#2f63da");

  const cccdFrontPhoto =
    toPublicAssetUrl(firstDefinedString(documents.cccdFrontPhoto, registration.cccd_front_url)) ||
    createPreviewSvg("CCCD mặt trước", baseTitle, "#2f63da");

  const cccdBackPhoto =
    toPublicAssetUrl(firstDefinedString(documents.cccdBackPhoto, registration.cccd_back_url)) ||
    createPreviewSvg("CCCD mặt sau", baseTitle, "#31b7d4");

  // Giữ các biến xem trước cũ được tham chiếu để thỏa điều kiện TypeScript nghiêm ngặt.
  void baseTitle;
  void portraitPhoto;
  void cccdFrontPhoto;
  void cccdBackPhoto;

  const rawCommitment = registration.commitmentConfirmed ?? registration.commitment_confirmed ?? registration.commitment_confirm;
  const commitmentConfirmed = rawCommitment === true || rawCommitment === 1 || rawCommitment === "1" || rawCommitment === "true";
  const blacklist = readRecord(registration.blacklist, rawRecord?.blacklist, dataRecord?.blacklist);

  return {
    id: toNumberOrNull(registration.id) ?? 0,
    email: firstDefinedString(registration.email, student.email),
    status: normalizeStatus(registration.status),
    rejectionReason: firstDefinedString(registration.rejectionReason, registration.reason) || undefined,
    submittedAt: firstDefinedString(registration.submittedAt, registration.created_at) || "Không rõ",
    formData,
    documents: {
      portraitPhoto: portraitPhotoUrl,
      cccdFrontPhoto: cccdFrontPhotoUrl,
      cccdBackPhoto: cccdBackPhotoUrl,
    },
    avatarUrl: portraitPhotoUrl,
    cccdFrontUrl: cccdFrontPhotoUrl,
    cccdBackUrl: cccdBackPhotoUrl,
    commitmentConfirmed,
    occupancy_id: toNumberOrNull(registration.occupancy_id) ?? null,
    assigned_room_id: toNumberOrNull(registration.assigned_room_id) ?? null,
    bedId: toNumberOrNull(registration.bedId ?? registration.assigned_bed_id) ?? null,
    bed_approval_status: normalizeBedApprovalStatus(registration.bed_approval_status),
    occupancy_status: firstDefinedString(registration.occupancy_status) || null,
    occupancy_reason: firstDefinedString(registration.occupancy_reason) || null,
    check_in_date: firstDefinedString(registration.check_in_date) || null,
    check_out_date: firstDefinedString(registration.check_out_date) || null,
    checkout_request: (() => {
      const cr = readRecord(registration.checkout_request);
      if (!cr) return null;
      return {
        id: toNumberOrNull(cr.id) ?? 0,
        reason: firstDefinedString(cr.reason) || "",
        expected_leave_date: firstDefinedString(cr.expected_leave_date) || "",
        created_at: firstDefinedString(cr.created_at) || "",
      };
    })(),
    priority_criteria: Array.isArray(registration.priority_criteria)
      ? (registration.priority_criteria as RegistrationRequest["priority_criteria"])
      : [],
    auto_decision: (registration.auto_decision ?? null) as RegistrationRequest["auto_decision"],
    auto_decision_reason: firstDefinedString(registration.auto_decision_reason) || null,
    decision_source: (registration.decision_source ?? null) as RegistrationRequest["decision_source"],
    manual_decision_reason: firstDefinedString(registration.manual_decision_reason) || null,
    source_dorm_reservation_id: toNumberOrNull(registration.source_dorm_reservation_id) ?? null,
    registration_period_id: toNumberOrNull(registration.registration_period_id) ?? null,
    bed_selection_days: toNumberOrNull(registration.bed_selection_days ?? registrationPeriod.bed_selection_days) ?? null,
    bed_selection_deadline: firstDefinedString(registration.bed_selection_deadline) || null,
    room_assigned_at: firstDefinedString(registration.room_assigned_at, registration.occupancy_created_at) || null,
    blacklist: blacklist
      ? {
          reason: firstDefinedString(blacklist.reason) || null,
          source: firstDefinedString(blacklist.source) || null,
          created_at: firstDefinedString(blacklist.created_at, blacklist.createdAt) || null,
        }
      : null,
    channel: (registration.channel as 'main' | 'rolling' | null) ?? null,
    period_name: firstDefinedString(registration.period_name) || null,
    period_status: firstDefinedString(registration.period_status) || null,
    registration_type: firstDefinedString(registration.registration_type) || null,
    top_priority_tier: toNumberOrNull(registration.top_priority_tier) ?? null,
    total_priority_score: toNumberOrNull(registration.total_priority_score) ?? null,
    approved_at: firstDefinedString(registration.approved_at) || null,
    current_year: toNumberOrNull(student.current_year) ?? null,
    cancelled_at: firstDefinedString(registration.cancelled_at) || null,
    cancellation_reason: firstDefinedString(registration.cancellation_reason) || null,
    cancelled_by: firstDefinedString(registration.cancelled_by) || null,
  };
};

const normalizeRegistrationResponse = (value: unknown): RegistrationRequest | null => {
  return normalizeRegistrationRequest(extract<unknown>(value));
};

const normalizeRegistrationResponseArray = (value: unknown): RegistrationRequest[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeRegistrationResponse(item))
    .filter((item): item is RegistrationRequest => item !== null);
};

export const getRegistrationRequests = async () => {
  return [];
};

export const getRegistrations = async (): Promise<RegistrationRequest[]> => {
  const res = await regApi.getRegistrations();
  return normalizeRegistrationResponseArray(res);
};

export const getRegistrationRequestsInstant = (): RegistrationRequest[] => {
  return [];
};

export const getRegistrationRequestByIdInstant = (id: number): RegistrationRequest | null => {
  void id;
  return null;
};

export const getLatestRegistrationByEmailInstant = (email: string): RegistrationRequest | null => {
  void email;
  return null;
};

export { getDormRoomsInstant, getDormBedsForRoomInstant, getDormBedPairsForRoomInstant };

const mapRoomApiToDormRoom = (room: RoomApi): DormRoom => ({
  id: room.id,
  building_code: room.building_code,
  room_number: room.room_number,
  totalBeds: room.beds?.length ?? room.capacity ?? 0,
  availableBeds: room.available_beds ?? room.beds?.filter((bed) => !bed.occupied).length ?? 0,
  capacity: room.capacity ?? room.beds?.length ?? 0,
  gender: room.floor?.gender ?? null,
  floor_id: room.floor?.id ?? room.floor_id,
  floor: room.floor
    ? {
        id: room.floor.id,
        building_code: room.floor.building_code,
        floor_number: room.floor.floor_number,
        gender: room.floor.gender ?? undefined,
      }
    : undefined,
  floor_number: room.floor_number ?? room.floor?.floor_number,
  beds: Array.isArray(room.beds)
    ? room.beds.map((bed) => ({
        id: bed.id,
        room_id: room.id,
        bed_number: Number(bed.bed_number) || 0,
        position: bed.position === "LOWER" ? "lower" : "upper",
        status: bed.status === "MAINTENANCE" ? "maintenance" : "active",
        occupied: bed.occupied,
      }))
    : [],
});

export const getRooms = async (): Promise<DormRoom[]> => {
  const rooms = await listRooms();
  return rooms.map(mapRoomApiToDormRoom);
};

export const getRegistrationById = async (id: number): Promise<RegistrationRequest | null> => {
  try {
    const res = await regApi.getRegistrationById(id);
    return normalizeRegistrationResponse(res);
  } catch {
    return null;
  }
};

export const getLatestRegistrationByEmail = async (email: string): Promise<RegistrationRequest | null> => {
  if (!email.trim()) {
    return null;
  }

  return getMyRegistration(email);
};

export const getRegistrationHistoryByEmailSemester = async (
  email: string,
  semester?: string
): Promise<RegistrationRequest[]> => {
  if (!email.trim()) {
    return [];
  }

  const res = await regApi.getRegistrationHistory(email, semester);
  return normalizeRegistrationResponseArray(res);
};

// Toàn bộ lịch sử đăng ký (mọi kỳ) của sinh viên đang đăng nhập, mới nhất trước.
export const getMyRegistrationHistory = async (email: string): Promise<RegistrationRequest[]> => {
  return getRegistrationHistoryByEmailSemester(email);
};

export const updateRegistrationStatus = async ({
  id,
  status,
  rejectionReason,
  currentRequest,
}: {
  id: number;
  status: "approved" | "rejected";
  rejectionReason?: string;
  currentRequest?: RegistrationRequest;
}): Promise<RegistrationRequest> => {
  const response =
    status === "approved"
      ? await regApi.approveRegistration(id)
      : await regApi.rejectRegistration(id, rejectionReason ?? "");

  // id=0 có nghĩa BE trả về message-only (không có registration data) → bỏ qua
  const updated = normalizeRegistrationResponse(response);
  if (updated && updated.id > 0) {
    dispatchRegistrationRequestsUpdated();
    return updated;
  }

  const refreshed = normalizeRegistrationResponse(await regApi.getRegistrationById(id));
  if (refreshed) {
    dispatchRegistrationRequestsUpdated();
    return refreshed;
  }

  if (!currentRequest) {
    throw new Error("Không thể cập nhật trạng thái đăng ký.");
  }

  const fallback: RegistrationRequest = {
    ...currentRequest,
    status,
    rejectionReason: status === "rejected" ? rejectionReason?.trim() ?? "" : undefined,
  };

  dispatchRegistrationRequestsUpdated();
  return fallback;
};

// Các tác vụ admin: wrapper tốt nhất - backend có thể cung cấp endpoint khác.
export const assignRoomToRegistration = async ({
  requestId,
  roomId,
  bedId,
  currentRequest,
}: {
  requestId: number;
  roomId: number;
  bedId?: number | null;
  currentRequest?: RegistrationRequest;
}): Promise<RegistrationRequest | null> => {
  void bedId;

  const current = currentRequest ?? normalizeRegistrationResponse(await regApi.getRegistrationById(requestId));
  if (!current) {
    throw new Error("Không tìm thấy đơn đăng ký.");
  }

  await regApi.assignRoom(requestId, roomId);

  const refreshed = normalizeRegistrationResponse(await regApi.getRegistrationById(requestId));
  const nextRequest = refreshed ?? {
    ...current,
    assigned_room_id: roomId,
    assigned_bed_id: null,
    bedId: null,
  };
  dispatchRegistrationRequestsUpdated();
  dispatchRoomsUpdated();

  return nextRequest;
};

export const selectBedForRegistration = async ({
  email,
  bedId,
  currentRequest,
}: {
  email: string;
  bedId: number;
  currentRequest?: RegistrationRequest;
}): Promise<{ request: RegistrationRequest; billId: number | null }> => {
  const current = currentRequest ?? normalizeRegistrationResponse(await regApi.getMyRegistration(email));
  if (!current) {
    throw new Error("Không tìm thấy đơn đăng ký của sinh viên.");
  }

  const result = await regApi.selectBed(email, bedId);

  const refreshed = normalizeRegistrationResponse(await regApi.getMyRegistration(email));
  const nextRequest = refreshed ?? {
    ...current,
    assigned_bed_id: bedId,
    bedId,
    bed_approval_status: "pending",
  };
  dispatchRegistrationRequestsUpdated();
  dispatchRoomsUpdated();

  return { request: nextRequest, billId: result.bill_id ?? null };
};

export const getEffectiveBedApprovalStatus = (
  requestOrStatus?: RegistrationRequest | RegistrationRequest["bed_approval_status"] | null,
  bedId?: number | null,
): RegistrationRequest["bed_approval_status"] | null => {
  if (!requestOrStatus) {
    return null;
  }

  if (typeof requestOrStatus === "string") {
    return bedId ? requestOrStatus : null;
  }

  if (!requestOrStatus.bedId) {
    return null;
  }

  return requestOrStatus.bed_approval_status ?? "pending";
};

export const approveBedSelectionForRegistration = async (id: number): Promise<RegistrationRequest | null> => {
  const updated = normalizeRegistrationResponse(await regApi.approveBedSelection(id));
  dispatchRegistrationRequestsUpdated();
  dispatchRoomsUpdated();
  return updated;
};

export const rejectBedSelectionForRegistration = async (id: number): Promise<RegistrationRequest | null> => {
  const updated = normalizeRegistrationResponse(await regApi.rejectBedSelection(id));
  dispatchRegistrationRequestsUpdated();
  dispatchRoomsUpdated();
  return updated;
};

export const requestCheckoutForRegistration = async ({
  email,
  reason,
  expectedLeaveDate,
}: {
  email: string;
  reason: string;
  expectedLeaveDate?: string;
}): Promise<RegistrationRequest | null> => {
  const updated = normalizeRegistrationResponse(await regApi.requestCheckout(email, reason, expectedLeaveDate));
  dispatchRegistrationRequestsUpdated();
  dispatchRoomsUpdated();
  return updated;
};

export const cancelCheckoutForRegistration = async (): Promise<RegistrationRequest | null> => {
  const updated = normalizeRegistrationResponse(await regApi.cancelCheckout());
  dispatchRegistrationRequestsUpdated();
  dispatchRoomsUpdated();
  return updated;
};

export const confirmCheckoutForRegistration = async (id: number): Promise<RegistrationRequest | null> => {
  const updated = normalizeRegistrationResponse(await regApi.confirmCheckout(id));
  dispatchRegistrationRequestsUpdated();
  dispatchRoomsUpdated();
  return updated;
};

export const forceCheckoutForRegistration = async (id: number, reason: string): Promise<RegistrationRequest | null> => {
  const updated = normalizeRegistrationResponse(await regApi.forceCheckout(id, reason));
  dispatchRegistrationRequestsUpdated();
  dispatchRoomsUpdated();
  return updated;
};

export const patchAutoDecision = async (
  id: number,
  decision: 'approve' | 'reject' | 'review',
  reason?: string,
): Promise<RegistrationRequest | null> => {
  const updated = normalizeRegistrationResponse(await regApi.patchAutoDecision(id, decision, reason));
  // Duyệt/Từ chối tay giờ có thể kéo theo xếp hạng lại tự động, ảnh hưởng tới NHIỀU đơn khác
  // cùng lúc (không chỉ đơn vừa bấm) — bắn sự kiện để toàn bộ danh sách tự tải lại mới nhất.
  dispatchRegistrationRequestsUpdated();
  return updated;
};

export const previewManualApprove = (id: number) => regApi.previewManualApprove(id);

export const confirmSingleRegistration = async (id: number): Promise<RegistrationRequest | null> => {
  const updated = normalizeRegistrationResponse(await regApi.confirmSingle(id));
  dispatchRegistrationRequestsUpdated();
  return updated;
};

export const confirmBatchRegistrations = async (
  periodId: number,
): Promise<{ confirmed: number; skipped_review: number; skipped_null: number }> => {
  const result = await regApi.confirmBatch(periodId);
  dispatchRegistrationRequestsUpdated();
  return result;
};

export const submitRegistration = async (formData: FormData): Promise<RegistrationRequest | null> => {
  const res = await regApi.submitRegistration(formData);
  const result = normalizeRegistrationResponse(res);
  if (result) {
    dispatchRegistrationRequestsUpdated();
  }
  return result;
};

export const getMyRegistration = async (email: string): Promise<RegistrationRequest | null> => {
  const res = await regApi.getMyRegistration(email);
  return normalizeRegistrationRequest(extract<unknown>(res));
};

export const verifyStudentPriority = async (
  id: number,
  status: "verified" | "rejected",
  note?: string,
): Promise<{ id: number; status: string; verified_at: string | null; top_priority_tier: number; total_priority_score: number; registration_status?: string; rejection_reason?: string | null }> => {
  const { data } = await apiClient.patch(`/admin/student-priority/${id}/verify`, { status, note });
  return data;
};

export default {
  getRegistrationRequests,
  getRegistrationRequestsInstant,
  getDormRoomsInstant,
  getDormBedsForRoomInstant,
  getDormBedPairsForRoomInstant,
  getRegistrationRequestByIdInstant,
  assignRoomToRegistration,
  selectBedForRegistration,
  approveBedSelectionForRegistration,
  rejectBedSelectionForRegistration,
  requestCheckoutForRegistration,
  confirmCheckoutForRegistration,
  forceCheckoutForRegistration,
  getEffectiveBedApprovalStatus,
  getRooms,
  getRegistrationById,
  getLatestRegistrationByEmail,
  getRegistrationHistoryByEmailSemester,
  getMyRegistrationHistory,
  updateRegistrationStatus,
  submitRegistration,
  getMyRegistration,
};
