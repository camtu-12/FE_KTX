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
    className: "border border-[#f3dd9c] bg-[#fff8df] text-[#9b6b00]",
  },
  approved: {
    label: "Đã duyệt",
    className: "border border-[#b9e6c7] bg-[#effcf3] text-[#16784b]",
  },
  rejected: {
    label: "Từ chối",
    className: "border border-[#f1c2c8] bg-[#fff3f5] text-[#bf3e53]",
  },
};

export const registrationRequests: RegistrationRequest[] = [
  {
    id: 1,
    email: "minhanh@stu.edu.vn",
    status: "pending",
    submittedAt: "2026-04-20 09:30",
    formData: {
      mssv: "DH52201699",
      fullName: "Nguyễn Minh Anh",
      gender: "female",
      class: "D22_TH03",
      department: "Công nghệ thông tin",
      phone: "0987654321",
      cccd: "079204001234",
      address: "12 Nguyễn Trãi, Quận 5, TP. Hồ Chí Minh",
      relationName: "Nguyễn Văn Hùng",
      relationPhone: "0908123456",
      relationship: "parent",
    },
    documents: {
      portraitPhoto: createPreviewSvg("Ảnh thẻ", "Nguyễn Minh Anh", "#244cb8"),
      cccdFrontPhoto: createPreviewSvg("CCCD mặt trước", "DH52201699", "#2f63da"),
      cccdBackPhoto: createPreviewSvg("CCCD mặt sau", "DH52201699", "#31b7d4"),
    },
  },
  {
    id: 2,
    email: "quocbao@stu.edu.vn",
    status: "approved",
    submittedAt: "2026-04-18 14:10",
    formData: {
      mssv: "DH52201701",
      fullName: "Trần Quốc Bảo",
      gender: "male",
      class: "D22_QT01",
      department: "Quản trị kinh doanh",
      phone: "0977112233",
      cccd: "079204009876",
      address: "45 Lê Hồng Phong, Quận 10, TP. Hồ Chí Minh",
      relationName: "Trần Thị Lan",
      relationPhone: "0911223344",
      relationship: "parent",
    },
    documents: {
      portraitPhoto: createPreviewSvg("Ảnh thẻ", "Trần Quốc Bảo", "#244cb8"),
      cccdFrontPhoto: createPreviewSvg("CCCD mặt trước", "DH52201701", "#2f63da"),
      cccdBackPhoto: createPreviewSvg("CCCD mặt sau", "DH52201701", "#31b7d4"),
    },
  },
  {
    id: 3,
    email: "hoangnam@stu.edu.vn",
    status: "rejected",
    rejectionReason: "Thiếu ảnh CCCD mặt sau.",
    submittedAt: "2026-04-17 08:45",
    formData: {
      mssv: "DH52201715",
      fullName: "Lê Hoàng Nam",
      gender: "male",
      class: "D22_XD02",
      department: "Xây Dựng",
      phone: "0933445566",
      cccd: "079204007654",
      address: "108 Phạm Văn Đồng, TP. Thủ Đức, TP. Hồ Chí Minh",
      relationName: "Lê Thị Hương",
      relationPhone: "0909988776",
      relationship: "parent",
    },
    documents: {
      portraitPhoto: createPreviewSvg("Ảnh thẻ", "Lê Hoàng Nam", "#244cb8"),
      cccdFrontPhoto: createPreviewSvg("CCCD mặt trước", "DH52201715", "#2f63da"),
      cccdBackPhoto: createPreviewSvg("CCCD mặt sau", "Chưa đạt yêu cầu", "#e25569"),
    },
  },
  {
    id: 4,
    email: "giahan@stu.edu.vn",
    status: "pending",
    submittedAt: "2026-04-21 10:20",
    formData: {
      mssv: "DH52201723",
      fullName: "Phạm Gia Hân",
      gender: "female",
      class: "D22_TP01",
      department: "Công nghệ thực phẩm",
      phone: "0966123456",
      cccd: "079204005555",
      address: "56 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh",
      relationName: "Phạm Đức Long",
      relationPhone: "0912345670",
      relationship: "parent",
    },
    documents: {
      portraitPhoto: createPreviewSvg("Ảnh thẻ", "Phạm Gia Hân", "#244cb8"),
      cccdFrontPhoto: createPreviewSvg("CCCD mặt trước", "DH52201723", "#2f63da"),
      cccdBackPhoto: createPreviewSvg("CCCD mặt sau", "DH52201723", "#31b7d4"),
    },
  },
  {
    id: 5,
    email: "khanhlinh@stu.edu.vn",
    status: "approved",
    submittedAt: "2026-04-16 16:05",
    formData: {
      mssv: "DH52201740",
      fullName: "Võ Khánh Linh",
      gender: "female",
      class: "D22_DT01",
      department: "Điện - Điện tử",
      phone: "0944556677",
      cccd: "079204003333",
      address: "89 Tô Hiến Thành, Quận 10, TP. Hồ Chí Minh",
      relationName: "Võ Minh Tâm",
      relationPhone: "0909111222",
      relationship: "parent",
    },
    documents: {
      portraitPhoto: createPreviewSvg("Ảnh thẻ", "Võ Khánh Linh", "#244cb8"),
      cccdFrontPhoto: createPreviewSvg("CCCD mặt trước", "DH52201740", "#2f63da"),
      cccdBackPhoto: createPreviewSvg("CCCD mặt sau", "DH52201740", "#31b7d4"),
    },
  },
];

export const getRegistrationRequestById = (id: number) =>
  registrationRequests.find((request) => request.id === id) ?? null;

