import * as regApi from "./registrationApi";
import {
  getDormBedPairsForRoomInstant,
  getDormBedsForRoomInstant,
  getDormRoomsInstant,
} from "../mocks/dormRoomStore.ts";
import type { DormRoom } from "../types/dormRoom.ts";
import type {
  RegistrationFormData,
  RegistrationRequest,
  RegistrationStatus,
} from "../modules/admin/data/registrationRequests";
import {
  dispatchRegistrationRequestsUpdated,
  getRegistrationRequestsSeed,
  getStoredRegistrationRequests,
  readLatestRegistrationByEmail,
  readRegistrationRequestById,
  upsertStoredRegistrationRequest,
} from "../modules/admin/data/registrationRequests";

// Sử dụng Railway URL từ environment variables (có fallback nếu biến không được set)
const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) || "http://127.0.0.1:8000").replace(/\/+$/, "");
const ASSIGNMENT_STORAGE_KEY = "mock_registration_assignments_v1";
const BED_SELECTION_STORAGE_KEY = "mock_registration_bed_selections_v1";


console.log("API_BASE:", API_BASE); // Debug - kiểm tra URL đúng không

type JsonRecord = Record<string, unknown>;
type AssignmentSnapshot = {
  requestId: number;
  roomId: number;
};
type BedSelectionSnapshot = {
  requestId: number;
  bedId: number;
};

const isRecord = (value: unknown): value is JsonRecord => typeof value === "object" && value !== null;

const isBrowser = () => typeof window !== "undefined";

const isAssignmentSnapshot = (value: unknown): value is AssignmentSnapshot => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.requestId === "number" &&
    typeof value.roomId === "number"
  );
};

const isBedSelectionSnapshot = (value: unknown): value is BedSelectionSnapshot => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.requestId === "number" && typeof value.bedId === "number";
};

const readStoredAssignments = (): AssignmentSnapshot[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ASSIGNMENT_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isAssignmentSnapshot) : [];
  } catch {
    return [];
  }
};

const writeStoredAssignments = (assignments: AssignmentSnapshot[]) => {
  if (!isBrowser()) {
    return assignments;
  }

  window.localStorage.setItem(ASSIGNMENT_STORAGE_KEY, JSON.stringify(assignments));
  return assignments;
};

const upsertStoredAssignment = (assignment: AssignmentSnapshot) => {
  const assignments = readStoredAssignments();
  const index = assignments.findIndex((item) => item.requestId === assignment.requestId);

  if (index >= 0) {
    assignments[index] = assignment;
  } else {
    assignments.push(assignment);
  }

  return writeStoredAssignments(assignments);
};

const readStoredBedSelections = (): BedSelectionSnapshot[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(BED_SELECTION_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isBedSelectionSnapshot) : [];
  } catch {
    return [];
  }
};

const writeStoredBedSelections = (selections: BedSelectionSnapshot[]) => {
  if (!isBrowser()) {
    return selections;
  }

  window.localStorage.setItem(BED_SELECTION_STORAGE_KEY, JSON.stringify(selections));
  return selections;
};

const upsertStoredBedSelection = (selection: BedSelectionSnapshot) => {
  const selections = readStoredBedSelections();
  const index = selections.findIndex((item) => item.requestId === selection.requestId);

  if (index >= 0) {
    selections[index] = selection;
  } else {
    selections.push(selection);
  }

  return writeStoredBedSelections(selections);
};

const dispatchRoomsUpdated = () => {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event("ktx-rooms-updated"));
};

const applyStoredAssignments = (requests: RegistrationRequest[]): RegistrationRequest[] => {
  const assignments = readStoredAssignments();
  const bedSelections = readStoredBedSelections();
  if (assignments.length === 0 && bedSelections.length === 0) {
    return requests;
  }

  const assignmentByRequestId = new Map(assignments.map((assignment) => [assignment.requestId, assignment]));
  const bedSelectionByRequestId = new Map(bedSelections.map((selection) => [selection.requestId, selection]));

  return requests.map((request) => {
    const assignment = assignmentByRequestId.get(request.id);
    const bedSelection = bedSelectionByRequestId.get(request.id);
    if (!assignment && !bedSelection) {
      return request;
    }

    return {
      ...request,
      assigned_room_id: assignment?.roomId ?? request.assigned_room_id ?? null,
      assigned_bed_id: bedSelection?.bedId ?? request.assigned_bed_id ?? null,
      bedId: bedSelection?.bedId ?? request.bedId ?? request.assigned_bed_id ?? null,
    };
  });
};

const applyStoredAssignment = (request: RegistrationRequest | null): RegistrationRequest | null => {
  if (!request) {
    return request;
  }

  return applyStoredAssignments([request])[0] ?? request;
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
  const cleanPath = normalized.replace(/^(api\/|storage\/)/, '');
  
  // Local development
  if (!API_BASE.includes('railway.app')) {
    return `${API_BASE}/storage/${cleanPath}`;
  }
  
  // Railway - use /api/storage/
  return `${API_BASE}/api/storage/${cleanPath}`;
};

const normalizeStatus = (value: unknown): RegistrationStatus => {
  if (value === "approved" || value === "rejected" || value === "pending") {
    return value;
  }

  return "pending";
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
  const fatherPhone = firstDefinedString(existingFormData.father_phone, registration.father_phone, student.father_phone);
  const fatherJob = firstDefinedString(existingFormData.father_job, registration.father_job, student.father_job);
  const motherName = firstDefinedString(existingFormData.mother_name, registration.mother_name, student.mother_name);
  const motherPhone = firstDefinedString(existingFormData.mother_phone, registration.mother_phone, student.mother_phone);
  const motherJob = firstDefinedString(existingFormData.mother_job, registration.mother_job, student.mother_job);
  const familyContactAddress = firstDefinedString(
    existingFormData.familyContactAddress,
    registration.familyContactAddress,
    registration.parent_address,
    student.parent_address,
  );
  const relationName = firstDefinedString(existingFormData.relationName, registration.parent_name, student.parent_name);
  const relationPhone = firstDefinedString(existingFormData.relationPhone, registration.parent_phone, student.parent_phone);
  const relationship = firstDefinedString(existingFormData.relationship, registration.parent_relationship, student.parent_relationship, "parent");
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
    father_phone: fatherPhone,
    father_job: fatherJob,
    mother_name: motherName,
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
    firstDefinedString(documents.portraitPhoto, registration.avatar_url, registration.avatar, student.avatar, documents.avatar),
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
    assigned_room_id: toNumberOrNull(registration.assigned_room_id) ?? null,
    bedId: toNumberOrNull(registration.bedId ?? registration.assigned_bed_id) ?? null,
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

const cloneRegistrationRequest = (request: RegistrationRequest): RegistrationRequest => ({
  ...request,
  formData: { ...request.formData },
  documents: { ...request.documents },
  student: request.student
    ? {
        account: request.student.account
          ? { ...request.student.account }
          : request.student.account,
      }
    : request.student,
});

const snapshotRegistrationRequests = (): RegistrationRequest[] => {
  const requests = getStoredRegistrationRequests();
  const snapshot = requests.length > 0 ? requests.map(cloneRegistrationRequest) : getRegistrationRequestsSeed().map(cloneRegistrationRequest);
  return applyStoredAssignments(snapshot);
};

const persistRegistrationRequest = (nextRequest: RegistrationRequest): RegistrationRequest => {
  upsertStoredRegistrationRequest(nextRequest);
  dispatchRegistrationRequestsUpdated();
  return cloneRegistrationRequest(nextRequest);
};

export const getRegistrationRequests = async () => {
  return snapshotRegistrationRequests();
};

export const getRegistrations = async (): Promise<RegistrationRequest[]> => {
  const res = await regApi.getRegistrations();
  return applyStoredAssignments(normalizeRegistrationResponseArray(res));
};

export const getRegistrationRequestsInstant = (): RegistrationRequest[] => {
  return snapshotRegistrationRequests();
};

export const getRegistrationRequestByIdInstant = (id: number): RegistrationRequest | null => {
  const request = readRegistrationRequestById(id);
  return applyStoredAssignment(request ? cloneRegistrationRequest(request) : null);
};

export const getLatestRegistrationByEmailInstant = (email: string): RegistrationRequest | null => {
  const request = readLatestRegistrationByEmail(email);
  return applyStoredAssignment(request ? cloneRegistrationRequest(request) : null);
};

export { getDormRoomsInstant, getDormBedsForRoomInstant, getDormBedPairsForRoomInstant };

export const getRooms = async (): Promise<DormRoom[]> => {
  return getDormRoomsInstant();
};

export const getRegistrationById = async (id: number): Promise<RegistrationRequest | null> => {
  try {
    const res = await regApi.getRegistrationById(id);
    return applyStoredAssignment(normalizeRegistrationResponse(res));
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
  semester: string
): Promise<RegistrationRequest[]> => {
  if (!email.trim()) {
    return [];
  }

  const res = await regApi.getRegistrationHistory(email, semester);
  return normalizeRegistrationResponseArray(res);
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

  const updated = normalizeRegistrationResponse(response);
  if (updated) {
    dispatchRegistrationRequestsUpdated();
    return updated;
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

  const current = readRegistrationRequestById(requestId)
    ?? currentRequest
    ?? normalizeRegistrationResponse(await regApi.getRegistrationById(requestId));
  if (!current) {
    throw new Error("Không tìm thấy đơn đăng ký.");
  }

  await regApi.assignRoom(requestId, roomId);

  const nextRequest = persistRegistrationRequest({
    ...current,
    assigned_room_id: roomId,
    assigned_bed_id: null,
    bedId: null,
  });

  upsertStoredAssignment({
    requestId,
    roomId,
  });
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
}) => {
  const current = readLatestRegistrationByEmail(email)
    ?? currentRequest
    ?? applyStoredAssignment(normalizeRegistrationResponse(await regApi.getMyRegistration(email)));
  if (!current) {
    throw new Error("Không tìm thấy đơn đăng ký của sinh viên.");
  }

  await regApi.selectBed(email, bedId);

  const nextRequest = persistRegistrationRequest({
    ...current,
    assigned_bed_id: bedId,
    bedId,
  });

  upsertStoredBedSelection({
    requestId: current.id,
    bedId,
  });
  dispatchRegistrationRequestsUpdated();
  dispatchRoomsUpdated();

  return nextRequest;
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
  return applyStoredAssignment(normalizeRegistrationRequest(extract<unknown>(res)));
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
  getRooms,
  getRegistrationById,
  getLatestRegistrationByEmail,
  getRegistrationHistoryByEmailSemester,
  updateRegistrationStatus,
  submitRegistration,
  getMyRegistration,
};
