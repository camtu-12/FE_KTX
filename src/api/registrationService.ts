import axios from "axios";
import * as regApi from "./registrationApi";
import type {
  RegistrationFormData,
  RegistrationRequest,
  RegistrationStatus,
} from "../modules/admin/data/registrationRequests";

const BASE_URL = "http://127.0.0.1:8000/api";

export type DormRoom = {
  id: number;
  building_code: string;
  room_number: number;
  totalBeds: number;
  availableBeds: number;
  gender: "male" | "female";
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

const extract = <T>(res: any): T => {
  if (!res) return res;
  if (Object.prototype.hasOwnProperty.call(res, "data")) return res.data;
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
  if (!value) {
    return "";
  }

  if (/^(data:|https?:\/\/)/i.test(value)) {
    return value;
  }

  const normalized = value.replace(/^\/+/, "");

  if (normalized.startsWith("storage/")) {
    return `http://127.0.0.1:8000/${normalized}`;
  }

  return `http://127.0.0.1:8000/storage/${normalized}`;
};

const normalizeStatus = (value: any): RegistrationStatus => {
  if (value === "approved" || value === "rejected" || value === "pending") {
    return value;
  }

  return "pending";
};

const normalizeRegistrationRequest = (raw: any): RegistrationRequest | null => {
  const registration = raw?.registration ?? raw?.data?.registration ?? raw?.data ?? raw;

  if (!registration || typeof registration !== "object") {
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

  const student = raw?.student ?? raw?.data?.student ?? registration.student ?? {};
  const account = student.account ?? raw?.account ?? raw?.data?.account ?? registration.account ?? {};
  const existingFormData = registration.formData ?? raw?.formData ?? {};

  const studentCode = existingFormData.mssv ?? account.student_code ?? student.student_code ?? "";
  const fullName = existingFormData.fullName ?? account.full_name ?? student.full_name ?? "";
  const gender = existingFormData.gender ?? student.gender ?? "";
  const className = existingFormData.class ?? student.class_name ?? "";
  const department = existingFormData.department ?? student.faculty ?? "";
  const phone = existingFormData.phone ?? student.phone ?? "";
  const cccd = existingFormData.cccd ?? student.cccd ?? "";
  const address = existingFormData.address ?? student.permanent_address ?? "";
  const relationName = existingFormData.relationName ?? student.parent_name ?? "";
  const relationPhone = existingFormData.relationPhone ?? student.parent_phone ?? "";
  const relationship = existingFormData.relationship ?? student.parent_relationship ?? "";

  const formData: RegistrationFormData = {
    mssv: studentCode,
    fullName,
    gender,
    class: className,
    department,
    phone,
    cccd,
    address,
    relationName,
    relationPhone,
    relationship,
  };

  const baseTitle = studentCode || fullName || "Sinh viên";
  const documents = registration.documents ?? raw?.documents ?? {};

  const portraitPhoto =
    toPublicAssetUrl(documents.portraitPhoto ?? student.avatar) ||
    createPreviewSvg("Ảnh thẻ", baseTitle, "#2f63da");

  const cccdFrontPhoto =
    toPublicAssetUrl(documents.cccdFrontPhoto ?? registration.cccd_front_url) ||
    createPreviewSvg("CCCD mặt trước", baseTitle, "#2f63da");

  const cccdBackPhoto =
    toPublicAssetUrl(documents.cccdBackPhoto ?? registration.cccd_back_url) ||
    createPreviewSvg("CCCD mặt sau", baseTitle, "#31b7d4");

  return {
    id: Number(registration.id ?? 0),
    email: registration.email ?? student.email ?? "",
    status: normalizeStatus(registration.status),
    rejectionReason: registration.rejectionReason ?? registration.reason ?? undefined,
    submittedAt: registration.submittedAt ?? registration.created_at ?? "Không rõ",
    formData,
    documents: {
      portraitPhoto,
      cccdFrontPhoto,
      cccdBackPhoto,
    },
    assigned_room_id: registration.assigned_room_id ?? null,
    bedId: registration.bedId ?? null,
  };
};

const normalizeRegistrationList = (rows: any[]) =>
  rows.map((row) => normalizeRegistrationRequest(row)).filter(Boolean) as RegistrationRequest[];

export const getRegistrationRequests = async () => {
  const res = await regApi.getRegistrations();
  return normalizeRegistrationList(extract<any[]>(res) ?? []);
};

export const getRegistrations = getRegistrationRequests;

export const getRegistrationRequestsInstant = (): any[] => {
  return [];
};

export const getRegistrationRequestByIdInstant = (_id: number) => {
  return null;
};

export const getLatestRegistrationByEmailInstant = (_email: string) => {
  return null;
};

export const getDormRoomsInstant = (): DormRoom[] => {
  return [];
};

export const getDormBedsForRoomInstant = (_roomId: number): DormBed[] => {
  return [];
};

export const getDormBedPairsForRoomInstant = (_roomId: number): DormBedPair[] => {
  return [];
};

export const getRooms = async (): Promise<DormRoom[]> => {
  const res = await regApi.getRooms();
  return extract<DormRoom[]>(res) ?? [];
};

export const getRegistrationById = async (id: number) => {
  const res = await regApi.getRegistrationById(id);
  return normalizeRegistrationRequest(extract<any>(res));
};

export const getLatestRegistrationByEmail = async (email: string) => {
  const res = await regApi.getMyRegistration(email);
  return normalizeRegistrationRequest(extract<any>(res));
};

export const updateRegistrationStatus = async ({
  id,
  status,
  rejectionReason,
}: {
  id: number;
  status: "approved" | "rejected";
  rejectionReason?: string;
}) => {
  try {
    if (status === "approved") {
      const res = await axios.put(`${BASE_URL}/registration/${id}/approve`);
      const updated = await getRegistrationById(id);
      return updated ?? extract<any>(res);
    }

    const res = await axios.put(`${BASE_URL}/registration/${id}/reject`, {
      rejectionReason: rejectionReason?.trim() ?? "",
    });
    const updated = await getRegistrationById(id);
    return updated ?? extract<any>(res);
  } catch (err: any) {
    const message = err?.response?.data?.message ?? err?.message ?? "Không thể cập nhật trạng thái đơn đăng ký.";
    throw new Error(message);
  }
};

// Admin actions: best-effort wrappers — backend may expose different endpoints.
export const assignRoomToRegistration = async ({ requestId, roomId }: { requestId: number; roomId: number }) => {
  try {
    const res = await axios.put(`${BASE_URL}/registration/${requestId}/assign-room`, { room_id: roomId });
    return extract<any>(res);
  } catch (err: any) {
    // Surface backend error message when available
    const message = err?.response?.data?.message ?? err?.message ?? "Không thể phân phòng (backend chưa hỗ trợ).";
    throw new Error(message);
  }
};

export const selectBedForRegistration = async ({ email, bedId }: { email: string; bedId: number }) => {
  try {
    // Assuming backend uses route with request id or email — try an email-based endpoint first
    const res = await axios.put(`${BASE_URL}/registration/select-bed`, { email, bed_id: bedId });
    return extract<any>(res);
  } catch (err: any) {
    const message = err?.response?.data?.message ?? err?.message ?? "Không thể chọn giường (backend chưa hỗ trợ).";
    throw new Error(message);
  }
};

export const submitRegistration = async (formData: FormData) => {
  const res = await regApi.submitRegistration(formData);
  return normalizeRegistrationRequest(extract<any>(res));
};

export const getMyRegistration = async (email: string) => {
  const res = await regApi.getMyRegistration(email);
  return extract<any>(res);
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
  updateRegistrationStatus,
  submitRegistration,
  getMyRegistration,
};
