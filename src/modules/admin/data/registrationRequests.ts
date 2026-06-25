export type RegistrationStatus = "submitted" | "approved" | "rejected";
export type RegistrationFilterStatus = "all" | RegistrationStatus;
export type AutoDecision = "approve" | "reject" | "review" | null;
export type RegistrationDocumentField = "portraitPhoto" | "cccdFrontPhoto" | "cccdBackPhoto";
export type BedApprovalStatus = "pending" | "approved" | "rejected";

export type BlacklistInfo = {
  reason?: string | null;
  source?: string | null;
  created_at?: string | null;
};

export type RegistrationFormData = {
  mssv: string;
  fullName: string;
  birthDate: string;
  gender: string;
  class: string;
  department: string;
  nationality: string;
  ethnicity: string;
  religion: string;
  phone: string;
  cccd: string;
  cccdIssueDate: string;
  cccdIssuePlace: string;
  address: string;
  father_name: string;
  father_phone: string;
  father_job: string;
  mother_name: string;
  mother_phone: string;
  mother_job: string;
  familyContactAddress: string;
  relationName: string;
  relationPhone: string;
  relationship: string;
  dormStartDate: string;
  dormEndDate: string;
};

export type RegistrationRequest = {
  id: number;
  email: string;
  status: RegistrationStatus;
  rejectionReason?: string;
  submittedAt: string;
  formData: RegistrationFormData;
  documents: Record<RegistrationDocumentField, string>;
  avatarUrl?: string;
  cccdFrontUrl?: string;
  cccdBackUrl?: string;
  commitmentConfirmed?: boolean;
  occupancy_id?: number | null;
  assigned_room_id?: number | null;
  assigned_bed_id?: number | null;
  bedId?: number | null;
  bed_approval_status?: BedApprovalStatus | null;
  occupancy_status?: string | null;
  occupancy_reason?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  student?: {
    account?: {
      student_code?: string;
      full_name?: string;
      email?: string;
    };
  };
  priority_criteria?: Array<{
    id: number;
    criteria_id: number;
    code: string;
    name: string;
    evidence_urls: string[];
    status: string;
  }>;
  auto_decision?: AutoDecision;
  auto_decision_reason?: string | null;
  registration_period_id?: number | null;
  bed_selection_days?: number | null;
  room_assigned_at?: string | null;
  blacklist?: BlacklistInfo | null;
  channel?: 'main' | 'rolling' | null;
  period_name?: string | null;
  period_status?: string | null;
  registration_type?: string | null;
  top_priority_tier?: number | null;
  total_priority_score?: number | null;
  approved_at?: string | null;
  current_year?: number | null;
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

void createPreviewSvg;

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

export const genderOptions = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
];

export const relationshipOptions = [
  { value: "parent", label: "Cha/Mẹ" },
  { value: "sibling", label: "Anh/Chị/Em" },
  { value: "grandparent", label: "Ông/Bà" },
  { value: "aunt", label: "Cô/Dì" },
  { value: "uncle", label: "Chú/Bác" },
  { value: "other", label: "Khác" },
];

export const statusMap: Record<
  RegistrationStatus,
  {
    label: string;
    className: string;
  }
> = {
  submitted: {
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

export const registrationRequests: RegistrationRequest[] = [];
/*
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
      birthDate: "01/01/2004",
      gender: "male",
      class: "DA22TH",
      department: "Công nghệ thông tin",
      nationality: "Việt Nam",
      ethnicity: "Kinh",
      religion: "Không",
      phone: "0912345678",
      cccd: "123456789012",
      cccdIssueDate: "01/01/2022",
      cccdIssuePlace: "Cục Cảnh sát QLHC về TTXH",
      address: "123 Đường ABC, TP.HCM",
      father_name: "Nguyễn Văn B",
      father_phone: "0987654321",
      father_job: "Công nhân",
      mother_name: "Trần Thị C",
      mother_phone: "0977888999",
      mother_job: "Nội trợ",
      familyContactAddress: "123 Đường ABC, TP.HCM",
      relationName: "Nguyễn Văn B",
      relationPhone: "0987654321",
      relationship: "parent",
      dormStartDate: "01/09/2026",
      dormEndDate: "31/05/2027",
    },
    documents: {
      portraitPhoto: createPreviewSvg("Ảnh thẻ", "DH52201900", "#2f63da"),
      cccdFrontPhoto: createPreviewSvg("CCCD mặt trước", "DH52201900", "#2f63da"),
      cccdBackPhoto: createPreviewSvg("CCCD mặt sau", "DH52201900", "#31b7d4"),
    },
  },
];
*/

export const getRegistrationRequestById = () => null;

const isBrowser = () => typeof window !== "undefined";

export const getRegistrationRequestsSeed = () => registrationRequests;

export const getStoredRegistrationRequests = (): RegistrationRequest[] => [];

export const writeStoredRegistrationRequests = (requests: RegistrationRequest[]) => {
  return requests;
};

export const upsertStoredRegistrationRequest = (nextRequest: RegistrationRequest): RegistrationRequest[] => {
  const requests = [...getStoredRegistrationRequests()];
  const index = requests.findIndex((request) => request.id === nextRequest.id);

  if (index >= 0) {
    requests[index] = nextRequest;
  } else {
    requests.push(nextRequest);
  }

  return writeStoredRegistrationRequests(requests);
};

export const replaceStoredRegistrationRequests = (nextRequests: RegistrationRequest[]) =>
  writeStoredRegistrationRequests(nextRequests);

export const dispatchRegistrationRequestsUpdated = () => {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event("ktx-registrations-updated"));
};

export const readRegistrationRequestById = (id: number): RegistrationRequest | null => {
  if (!Number.isFinite(id)) {
    return null;
  }

  return getStoredRegistrationRequests().find((request) => request.id === id) ?? null;
};

export const readLatestRegistrationByEmail = (email: string): RegistrationRequest | null => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  return getStoredRegistrationRequests()
    .filter((request) => request.email.trim().toLowerCase() === normalizedEmail)
    .sort((a, b) => b.id - a.id)[0] ?? null;
};

