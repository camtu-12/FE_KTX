export type RegistrationStatus = "pending" | "approved" | "rejected";
export type RegistrationFilterStatus = "all" | RegistrationStatus;
export type RegistrationDocumentField = "portraitPhoto" | "cccdFrontPhoto" | "cccdBackPhoto";

export type RegistrationFormData = {
  mssv: string;
  fullName: string;
  gender: string;
  class: string;
  department: string;
  phone: string;
  cccd: string;
  address: string;
  relationName: string;
  relationPhone: string;
  relationship: string;
};

export type RegistrationRequest = {
  id: number;
  email: string;
  status: RegistrationStatus;
  rejectionReason?: string;
  submittedAt: string;
  formData: RegistrationFormData;
  documents: Record<RegistrationDocumentField, string>;
  assigned_room_id?: number | null;
  bedId?: number | null;
  student?: {
    account?: {
      student_code?: string;
      full_name?: string;
      email?: string;
    };
  };
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

export const documentLabels: Record<RegistrationDocumentField, string> = {
  portraitPhoto: "Ảnh thẻ",
  cccdFrontPhoto: "CCCD mặt trước",
  cccdBackPhoto: "CCCD mặt sau",
};

export const departmentOptions = [
  "Cơ khí",
  "Công nghệ thực phẩm",
  "Công nghệ thông tin",
  "Design",
  "Điện - Điện tử",
  "Kinh tế - Quản trị",
  "Quản trị kinh doanh",
  "Xây Dựng",
];

export const relationshipOptions = [
  { value: "parent", label: "Cha/Mẹ" },
  { value: "sibling", label: "Anh/Chị/Em" },
  { value: "grandparent", label: "Ông/Bà" },
  { value: "other", label: "Khác" },
];

export const statusMap: Record<
  RegistrationStatus,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "Chờ duyệt",
    className: "border border-amber-200 bg-amber-50 text-amber-700",
  },
  approved: {
    label: "Đã duyệt",
    className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  rejected: {
    label: "Bị từ chối",
    className: "border border-rose-200 bg-rose-50 text-rose-700",
  },
};

export const registrationRequests: RegistrationRequest[] = [
  {
    id: 1,
    email: "student1@example.com",
    status: "pending",
    submittedAt: "2026-05-01",
    student: {
      account: {
        student_code: "DH52201900",
        full_name: "Nguyễn Văn A",
        email: "student1@example.com",
      },
    },
    formData: {
      mssv: "DH52201900",
      fullName: "Nguyễn Văn A",
      gender: "male",
      class: "DA22TH",
      department: "Công nghệ thông tin",
      phone: "0912345678",
      cccd: "123456789012",
      address: "123 Đường ABC, TP.HCM",
      relationName: "Nguyễn Văn B",
      relationPhone: "0987654321",
      relationship: "parent",
    },
    documents: {
      portraitPhoto: createPreviewSvg("Ảnh thẻ", "DH52201900", "#2f63da"),
      cccdFrontPhoto: createPreviewSvg("CCCD mặt trước", "DH52201900", "#2f63da"),
      cccdBackPhoto: createPreviewSvg("CCCD mặt sau", "DH52201900", "#31b7d4"),
    },
  },
];

export const getRegistrationRequestById = (id: number) =>
  registrationRequests.find((request) => request.id === id) ?? null;

