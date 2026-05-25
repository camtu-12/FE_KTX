import axios from "axios";
import * as regApi from "./registrationApi";
import type {
  RegistrationFormData,
  RegistrationRequest,
  RegistrationStatus,
} from "../modules/admin/data/registrationRequests";

// Sử dụng Railway URL từ environment variables
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string).replace(/\/+$/, "");
const BASE_URL = `${API_BASE}/api`;

console.log("API_BASE:", API_BASE); // Debug - kiểm tra URL đúng không

export type DormRoom = {
  id: number;
  building_code: string;
  room_number: number;
  totalBeds: number;
  availableBeds: number;
  gender?: string | null;
};

export type DormBed = {
  id: number;
  room_id: number;
  bed_number: number;
  position: "upper" | "lower";
  status: "occupied" | "empty" | "maintenance";
};

export type DormBedPair = {
  pairNumber: number;
  upper: DormBed;
  lower: DormBed;
};

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => typeof value === "object" && value !== null;

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
  if (/^(data:|https?:\/\/)/i.test(value)) return value;

  const normalized = String(value).replace(/^\/+/, "");

  if (normalized.startsWith("storage/")) {
    return `${API_BASE}/${normalized}`;
  }

  return `${API_BASE}/storage/${normalized}`;
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
    firstDefinedString(documents.portraitPhoto, registration.avatar, student.avatar, documents.avatar),
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

const normalizeRegistrationList = (rows: unknown[]) =>
  rows.map((row) => normalizeRegistrationRequest(row)).filter(Boolean) as RegistrationRequest[];

export const getRegistrationRequests = async () => {
  const res = await regApi.getRegistrations();
  return normalizeRegistrationList(extract<unknown[]>(res) ?? []);
};

export const getRegistrations = getRegistrationRequests;

export const getRegistrationRequestsInstant = (): RegistrationRequest[] => {
  return [];
};

export const getRegistrationRequestByIdInstant = (_id: number): RegistrationRequest | null => {
  void _id;
  return null;
};

export const getLatestRegistrationByEmailInstant = (_email: string): RegistrationRequest | null => {
  void _email;
  return null;
};

export const getDormRoomsInstant = (): DormRoom[] => {
  return [];
};

export const getDormBedsForRoomInstant = (_roomId: number): DormBed[] => {
  void _roomId;
  return [];
};

export const getDormBedPairsForRoomInstant = (_roomId: number): DormBedPair[] => {
  void _roomId;
  return [];
};

export const getRooms = async (): Promise<DormRoom[]> => {
  const res = await regApi.getRooms();
  return extract<DormRoom[]>(res) ?? [];
};

export const getRegistrationById = async (id: number): Promise<RegistrationRequest | null> => {
  const res = await regApi.getRegistrationById(id);
  return normalizeRegistrationRequest(extract<unknown>(res));
};

export const getLatestRegistrationByEmail = async (email: string): Promise<RegistrationRequest | null> => {
  const res = await regApi.getMyRegistration(email);
  return normalizeRegistrationRequest(extract<unknown>(res));
};

export const getRegistrationHistoryByEmailSemester = async (
  email: string,
  semester: string
): Promise<RegistrationRequest[]> => {
  const res = await regApi.getRegistrationHistory(email, semester);
  const rows = Array.isArray(res) ? res : [];
  return rows.map((row) => normalizeRegistrationRequest(row)).filter(Boolean) as RegistrationRequest[];
};

export const updateRegistrationStatus = async ({
  id,
  status,
  rejectionReason,
}: {
  id: number;
  status: "approved" | "rejected";
  rejectionReason?: string;
}): Promise<RegistrationRequest> => {
  try {
    if (status === "approved") {
      await regApi.API.put(`/registration/${id}/approve`);
      const updated = await getRegistrationById(id);
      if (!updated) {
        throw new Error("Không thể tải lại đơn đăng ký sau khi duyệt.");
      }

      return updated;
    }

    await regApi.API.put(`/registration/${id}/reject`, {
      rejectionReason: rejectionReason?.trim() ?? "",
    });
    const updated = await getRegistrationById(id);
    if (!updated) {
      throw new Error("Không thể tải lại đơn đăng ký sau khi từ chối.");
    }

    return updated;
  } catch (err: unknown) {
    const error = isRecord(err) ? err : null;
    const response = readRecord(error?.response);
    const responseData = readRecord(response?.data);
    const message = firstDefinedString(responseData?.message, error?.message, "Không thể cập nhật trạng thái đơn đăng ký.");
    throw new Error(message);
  }
};

// Các tác vụ admin: wrapper tốt nhất - backend có thể cung cấp endpoint khác.
export const assignRoomToRegistration = async ({ requestId, roomId }: { requestId: number; roomId: number }): Promise<RegistrationRequest | null> => {
  try {
    const res = await axios.put(`${BASE_URL}/registration/${requestId}/assign-room`, { room_id: roomId });
    void res;
    return getRegistrationById(requestId);
  } catch (err: unknown) {
    const error = isRecord(err) ? err : null;
    const response = readRecord(error?.response);
    const responseData = readRecord(response?.data);
    const message = firstDefinedString(responseData?.message, error?.message, "Không thể phân phòng (backend chưa hỗ trợ).");
    throw new Error(message);
  }
};

export const selectBedForRegistration = async ({ email, bedId }: { email: string; bedId: number }) => {
  try {
    const res = await axios.put(`${BASE_URL}/registration/select-bed`, { email, bed_id: bedId });
    return extract<unknown>(res);
  } catch (err: unknown) {
    const error = isRecord(err) ? err : null;
    const response = readRecord(error?.response);
    const responseData = readRecord(response?.data);
    const message = firstDefinedString(responseData?.message, error?.message, "Không thể chọn giường (backend chưa hỗ trợ).");
    throw new Error(message);
  }
};

export const submitRegistration = async (formData: FormData): Promise<RegistrationRequest | null> => {
  const res = await regApi.submitRegistration(formData);
  return normalizeRegistrationRequest(extract<unknown>(res));
};

export const getMyRegistration = async (email: string): Promise<RegistrationRequest | null> => {
  const res = await regApi.getMyRegistration(email);
  return normalizeRegistrationRequest(extract<unknown>(res));
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
