import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle,
  Clock,
  FileCheck,
  GraduationCap,
  Home,
  ImagePlus,
  Loader2,
  LoaderCircle,
  Paperclip,
  Receipt,
  Shield,
  ShieldX,
  Star,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import {
  getLatestRegistrationByEmail,
  getMyRegistrationHistory,
  submitRegistration,
} from "../../../api/registrationService";
import { checkEligibility, getRegistrationPeriods, getPriorityCriteria, type EligibilityResult, type RegistrationPeriodData } from "../../../api/registrationApi";
import { checkStudentCodeExists } from "../../auth/services/auth.api";
import { fetchStudentProfile } from "../../../api/studentProfileApi";
import { useAuthStore } from "../../auth/store";
import { statusMap, type RegistrationRequest } from "../../admin/data/registrationRequests";
import { formatDate } from "../../../utils/dateFormat";

const registrationTypeLabel: Record<string, string> = {
  new: "Đăng ký mới",
  renewal: "Gia hạn",
  emergency: "Khẩn cấp",
};

type RegistrationStatus = "unregistered" | "submitted" | "approved" | "rejected" | "completed";
type DocumentField = "portraitPhoto" | "cccdFrontPhoto" | "cccdBackPhoto";

interface PriorityCriteria {
  id: number;
  code: string;
  name: string;
  description?: string;
  priority_score?: number;
  tier?: number;
}

interface FormData {
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
  current_address: string;
  father_name: string;
  father_birth_year: string;
  father_phone: string;
  father_job: string;
  mother_name: string;
  mother_birth_year: string;
  mother_phone: string;
  mother_job: string;
  familyContactAddress: string;
  relationName: string;
  relationPhone: string;
  relationship: string;
  dormStartDate: string;
  dormEndDate: string;
}


const initialFormData: FormData = {
  mssv: "",
  fullName: "",
  birthDate: "",
  gender: "",
  class: "",
  department: "",
  nationality: "",
  ethnicity: "",
  religion: "",
  phone: "",
  cccd: "",
  cccdIssueDate: "",
  cccdIssuePlace: "",
  address: "",
  current_address: "",
  father_name: "",
  father_birth_year: "",
  father_phone: "",
  father_job: "",
  mother_name: "",
  mother_birth_year: "",
  mother_phone: "",
  mother_job: "",
  familyContactAddress: "",
  relationName: "",
  relationPhone: "",
  relationship: "",
  dormStartDate: "",
  dormEndDate: "",
};

const documentLabels: Record<DocumentField, string> = {
  portraitPhoto: "Ảnh thẻ",
  cccdFrontPhoto: "CCCD mặt trước",
  cccdBackPhoto: "CCCD mặt sau",
};

const documentUploadHints: Record<DocumentField, string> = {
  portraitPhoto: "Chọn ảnh chân dung rõ mặt",
  cccdFrontPhoto: "Ảnh rõ nét, không bị chói",
  cccdBackPhoto: "Ảnh rõ nét, không bị chói",
};

const phoneRegex = /^\d{10}$/;
const cccdRegex = /^\d{12}$/;

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

const documentFieldConfigs: Array<{ field: DocumentField }> = [
  { field: "portraitPhoto" },
  { field: "cccdFrontPhoto" },
  { field: "cccdBackPhoto" },
];

const acceptedDocumentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxDocumentFileSize = 2 * 1024 * 1024;

const uploadFieldToDocumentField: Record<string, DocumentField> = {
  avatar: "portraitPhoto",
  cccd_front: "cccdFrontPhoto",
  cccd_back: "cccdBackPhoto",
};

// Map tên field validate của backend (StoreRegistrationRequest) sang key tương ứng trong FormData,
// để lỗi trả về từ server hiện đúng ngay dưới ô input và có thể cuộn tới (giống lỗi validate client-side).
const backendFieldToFormField: Partial<Record<string, keyof FormData>> = {
  student_code: "mssv",
  full_name: "fullName",
  date_of_birth: "birthDate",
  gender: "gender",
  class_name: "class",
  faculty: "department",
  phone: "phone",
  cccd: "cccd",
  cccd_issued_date: "cccdIssueDate",
  cccd_issued_place: "cccdIssuePlace",
  nationality: "nationality",
  ethnicity: "ethnicity",
  religion: "religion",
  permanent_address: "address",
  father_name: "father_name",
  father_birth_year: "father_birth_year",
  father_job: "father_job",
  father_phone: "father_phone",
  mother_name: "mother_name",
  mother_birth_year: "mother_birth_year",
  mother_job: "mother_job",
  mother_phone: "mother_phone",
  emergency_contact_name: "relationName",
  emergency_contact_phone: "relationPhone",
  emergency_contact_relationship: "relationship",
  parent_address: "familyContactAddress",
  stay_from_date: "dormStartDate",
  stay_to_date: "dormEndDate",
};

const initialDocumentFiles: Record<DocumentField, File | null> = {
  portraitPhoto: null,
  cccdFrontPhoto: null,
  cccdBackPhoto: null,
};

const initialDocumentPreviewUrls: Record<DocumentField, string> = {
  portraitPhoto: "",
  cccdFrontPhoto: "",
  cccdBackPhoto: "",
};

const departmentOptions = [
  "Cơ khí",
  "Công nghệ thực phẩm",
  "Công nghệ thông tin",
  "Design",
  "Điện - Điện tử",
  "Kinh tế - Quản trị",
  "Quản trị kinh doanh",
  "Xây Dựng",
];

const genderOptions = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
];

const relationshipOptions = [
  { value: "parent", label: "Cha/Mẹ" },
  { value: "sibling", label: "Anh/Chị/Em" },
  { value: "grandparent", label: "Ông/Bà" },
  { value: "aunt", label: "Cô/Dì" },
  { value: "uncle", label: "Chú/Bác" },
  { value: "other", label: "Khác" },
];

const dateFieldNames: Array<keyof FormData> = ["birthDate", "cccdIssueDate"];

const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;

// Khớp rule "min:2" + regex chỉ chữ cái của StoreRegistrationRequest (backend) cho các trường họ tên,
// để lỗi hiện ngay ở lần submit đầu tiên thay vì phải đợi round-trip lên backend mới thấy.
const nameFieldNames: Array<keyof FormData> = ["fullName", "father_name", "mother_name"];
const nameRegex = /^[\p{L}\s]+$/u;

type RequiredRegistrationField = Exclude<keyof FormData, "dormStartDate" | "dormEndDate">;

const formFieldLabels: Record<RequiredRegistrationField, string> = {
  mssv: "MSSV",
  fullName: "họ và tên",
  birthDate: "ngày sinh",
  gender: "giới tính",
  class: "lớp",
  department: "khoa",
  nationality: "quốc tịch",
  ethnicity: "dân tộc",
  religion: "tôn giáo",
  phone: "số điện thoại",
  cccd: "số CCCD",
  cccdIssueDate: "ngày cấp",
  cccdIssuePlace: "nơi cấp",
  address: "địa chỉ thường trú",
  current_address: "địa chỉ hiện tại",
  father_name: "họ tên cha",
  father_birth_year: "năm sinh cha",
  father_phone: "SĐT cha",
  father_job: "nghề nghiệp cha",
  mother_name: "họ tên mẹ",
  mother_birth_year: "năm sinh mẹ",
  mother_phone: "SĐT mẹ",
  mother_job: "nghề nghiệp mẹ",
  familyContactAddress: "địa chỉ liên hệ cha/mẹ",
  relationName: "người liên hệ khẩn cấp",
  relationPhone: "SĐT người liên hệ",
  relationship: "quan hệ",
};

const commitmentSections = [
  {
    title: "I. Về trách nhiệm chấp hành quy định",
    items: [
      "Chấp hành nghiêm túc nội quy, quy chế Ký túc xá, các quy định của Nhà trường và pháp luật Nhà nước.",
      "Tôn trọng, chấp hành sự điều hành và hướng dẫn của Nhà trường, Ban Quản lý Ký túc xá (BQL KTX).",
      "Có thái độ ứng xử văn minh, lịch sự, đoàn kết, tương trợ với các sinh viên cùng lưu trú.",
      "Tự chịu trách nhiệm và bảo quản tài sản cá nhân có giá trị (tiền, laptop, điện thoại, đồ trang sức,...), công cụ, dụng cụ cá nhân.",
      "Sử dụng điện, nước và tài sản ký túc xá tiết kiệm, đúng mục đích, có ý thức bảo quản tài sản chung.",
    ],
  },
  {
    title: "II. Về nghĩa vụ tài chính và quản lý cư trú",
    items: [
      "Thực hiện đầy đủ nghĩa vụ đóng phí lưu trú, điện, nước và các khoản phí phát sinh (nếu có) đúng thời hạn theo thông báo của Nhà trường.",
      "Không dẫn khách lạ vào ký túc xá; nếu là phụ huynh thì phải có sự đồng ý của BQL KTX. Khi phát hiện người lạ, có hành vi xâm phạm, phá hoại tài sản, trộm cắp kịp thời báo ngay cho BQL KTX.",
      "Thực hiện đăng ký tạm trú, tạm vắng theo quy định của pháp luật và thông báo với BQL KTX khi có thay đổi.",
      "Khi có nhu cầu ngưng lưu trú, phải báo cho BQL KTX để hướng dẫn làm thủ tục theo quy định.",
    ],
  },
  {
    title: "III. Cam kết về hành vi cá nhân và an ninh trật tự",
    items: [
      "Không sử dụng, tàng trữ chất cấm, chất cháy nổ, không sử dụng và phát tán các tài liệu, phim ảnh đồi trụy, phản động hoặc truy cập các website có nội dung không lành mạnh; không sử dụng mạng xã hội vào mục đích tuyên truyền, kết nối với các tổ chức liên quan đến khủng bố.",
      "Không tổ chức tụ tập đông người, gây mất trật tự; không tham gia đánh bạc dưới mọi hình thức; không uống rượu, bia, chất có cồn, hút thuốc trong phòng, khuôn viên ký túc xá và nội bộ khuôn viên trường.",
      "Thực hiện nghiêm túc các quy định về phòng cháy chữa cháy; không nấu ăn, đốt lửa và sử dụng các thiết bị điện công suất lớn trái quy định trong phòng ở, khu vực ký túc xá, khuôn viên trường.",
      "Tham gia đầy đủ các buổi họp, phổ biến nội quy, diễn tập phòng cháy chữa cháy, phòng chống dịch bệnh hoặc các hoạt động khác do Nhà trường, BQL KTX tổ chức.",
    ],
  },
];

type FormFieldConfig = {
  name: keyof FormData;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  helperText?: string;
  fullWidth?: boolean;
  onBlur?: () => void;
};

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// Helper function to build image URLs for both local and Railway environments
const buildImageUrl = (path?: string): string => {
  if (!path) return "";

  // If it's already a full URL (data URL, external URL, or Railway API URL)
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    console.log('[buildImageUrl] Using existing URL:', path.substring(0, 100));
    return path;
  }

  const apiBase = (import.meta.env.VITE_API_BASE_URL as string || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");

  // Check if this is a Railway volume path (starts with students/ or registrations/)
  if (normalizedPath.startsWith('students/') || normalizedPath.startsWith('registrations/')) {
    // Use the API storage endpoint for Railway volume files
    const url = `${apiBase}/storage/${normalizedPath}`;
    console.log('[buildImageUrl] Railway volume URL:', url);
    return url;
  }

  // Local development - use public storage
  const storageBase = apiBase.endsWith("/api") ? apiBase.slice(0, -4) : apiBase;
  const url = `${storageBase}/storage/${normalizedPath}`;
  console.log('[buildImageUrl] Local storage URL:', url);
  return url;
};

export default function RegistrationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isResubmit = searchParams.get("resubmit") === "true";
  const [step, setStep] = useState<"info" | "form">(isResubmit ? "form" : "info");
  const studentEmail = useAuthStore((state) => state.user?.email ?? "");
  const studentCodeFromAuth = useAuthStore((state) => {
    const user = state.user;
    return user ? user.student_code ?? user.studentCode ?? "" : "";
  });
  const [registration, setRegistration] = useState<RegistrationRequest | null>(null);
  const [status, setStatus] = useState<RegistrationStatus>("unregistered");
  const [registrationHistory, setRegistrationHistory] = useState<RegistrationRequest[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [documentFiles, setDocumentFiles] = useState<Record<DocumentField, File | null>>(initialDocumentFiles);
  const [draggingDocumentField, setDraggingDocumentField] = useState<DocumentField | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedRegistration, setHasLoadedRegistration] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [periodsForStatus, setPeriodsForStatus] = useState<RegistrationPeriodData[] | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [documentErrors, setDocumentErrors] = useState<Partial<Record<DocumentField, string>>>({});
  const [reviewDocumentUrls, setReviewDocumentUrls] = useState<Record<DocumentField, string>>(initialDocumentPreviewUrls);
  const [commitmentConfirmed, setCommitmentConfirmed] = useState(false);
  const [isCheckingMssv, setIsCheckingMssv] = useState(false);
  const [studentDataReadonly, setStudentDataReadonly] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);
  // Field cha/mẹ + liên hệ khẩn cấp chỉ readonly từng field một, tùy field đó đã có
  // sẵn dữ liệu (khác null/rỗng) trong students hay chưa — khác với 14 field Bước 1
  // vốn luôn readonly một khi đã autoLoaded (vì các cột đó not-null ngay từ lúc tạo tài khoản).
  const [prefilledFamilyFieldNames, setPrefilledFamilyFieldNames] = useState<Set<keyof FormData>>(new Set());
  const [priorityCriteriaList, setPriorityCriteriaList] = useState<PriorityCriteria[]>([]);
  const [selectedCriteriaIds, setSelectedCriteriaIds] = useState<number[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<Record<number, File[]>>({});
  const [evidenceErrors, setEvidenceErrors] = useState<Record<number, string>>({});
  type BlurLevel = 'ok' | 'warn' | 'blur' | 'small' | 'analyzing' | null;
  const initialBlurStatus: Record<DocumentField, BlurLevel> = { portraitPhoto: null, cccdFrontPhoto: null, cccdBackPhoto: null };
  const [blurStatus, setBlurStatus] = useState<Record<DocumentField, BlurLevel>>(initialBlurStatus);
  const [blurWarnField, setBlurWarnField] = useState<DocumentField | null>(null);
  const [pendingBlurFile, setPendingBlurFile] = useState<{ field: DocumentField; file: File } | null>(null);
  const MAX_EVIDENCE_FILES = 6;
  const formRef = useRef<HTMLFormElement | null>(null);
  const fieldRefs = useRef<
    Partial<Record<keyof FormData, HTMLInputElement | HTMLSelectElement | null>>
  >({});
  const documentRefs = useRef<Partial<Record<DocumentField, HTMLInputElement | null>>>({});
  const evidenceRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const criteriaRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const documentPreviewUrls = useMemo(() => {
    const nextPreviewUrls = { ...initialDocumentPreviewUrls };

    documentFieldConfigs.forEach(({ field }) => {
      const file = documentFiles[field];
      if (!file) {
        // Hiển thị preview tài liệu đã tải lên nếu có
        if (reviewDocumentUrls[field]) {
          nextPreviewUrls[field] = reviewDocumentUrls[field];
        }
        return;
      }

      nextPreviewUrls[field] = URL.createObjectURL(file);
    });

    return nextPreviewUrls;
  }, [documentFiles, reviewDocumentUrls]);


  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await getPriorityCriteria();
        if (mounted) {
          setPriorityCriteriaList(Array.isArray(list) ? (list as PriorityCriteria[]) : []);
        }
      } catch {
        if (mounted) setPriorityCriteriaList([]);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  // When user is logged in with a student_code, auto-load student info and prefill form
  // reusable loader to populate formData from student_code
  const loadStudentData = useCallback(async (code?: string) => {
    const trimmed = code?.trim();
    if (!trimmed) return;

    try {
      setIsCheckingMssv(true);
      // Dữ liệu cá nhân nhạy cảm (CCCD, SĐT, địa chỉ...) chỉ được lấy qua endpoint đã xác
      // thực (/student/profile, tự suy ra danh tính từ token), không dùng check-student-code
      // công khai — endpoint đó giờ chỉ trả về { exists } để tránh lộ PII cho người chưa đăng nhập.
      const profile = await fetchStudentProfile();
      const student = profile.student;
      if (!student) return;

      const mapDate = (val?: string | null) => {
        if (!val) return "";
        const parts = val.split("-");
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return val;
      };

      const family = profile.family;

      // Chỉ những field thật sự có giá trị (khác null/rỗng) trong students mới bị khóa
      // readonly — field null vẫn cho nhập tay như trước (VD sinh viên chưa được seed).
      const familyFieldSource: Partial<Record<keyof FormData, string | null | undefined>> = {
        father_name: family?.father_name,
        father_birth_year: family?.father_birth_year,
        father_job: family?.father_job,
        father_phone: family?.father_phone,
        mother_name: family?.mother_name,
        mother_birth_year: family?.mother_birth_year,
        mother_job: family?.mother_job,
        mother_phone: family?.mother_phone,
        familyContactAddress: family?.parent_address,
        relationName: family?.emergency_contact_name,
        relationPhone: family?.emergency_contact_phone,
        relationship: family?.emergency_contact_relationship,
      };
      const nextPrefilledFamilyFields = new Set<keyof FormData>();
      (Object.keys(familyFieldSource) as Array<keyof FormData>).forEach((key) => {
        const val = familyFieldSource[key];
        if (val && val.trim() !== "") nextPrefilledFamilyFields.add(key);
      });
      setPrefilledFamilyFieldNames(nextPrefilledFamilyFields);

      setFormData((prev) => ({
        ...prev,
        mssv: student.student_code ?? trimmed,
        fullName: student.full_name ?? prev.fullName,
        birthDate: mapDate(student.date_of_birth),
        gender: student.gender ?? prev.gender,
        class: student.class_name ?? prev.class,
        department: student.faculty ?? prev.department,
        nationality: student.nationality ?? prev.nationality,
        ethnicity: student.ethnicity ?? prev.ethnicity,
        religion: student.religion ?? prev.religion,
        phone: student.phone ?? prev.phone,
        cccd: student.cccd ?? prev.cccd,
        cccdIssueDate: mapDate(student.cccd_issued_date),
        cccdIssuePlace: student.cccd_issued_place ?? prev.cccdIssuePlace,
        address: student.permanent_address ?? prev.address,
        father_name: family?.father_name ?? prev.father_name,
        father_birth_year: family?.father_birth_year ?? prev.father_birth_year,
        father_job: family?.father_job ?? prev.father_job,
        father_phone: family?.father_phone ?? prev.father_phone,
        mother_name: family?.mother_name ?? prev.mother_name,
        mother_birth_year: family?.mother_birth_year ?? prev.mother_birth_year,
        mother_job: family?.mother_job ?? prev.mother_job,
        mother_phone: family?.mother_phone ?? prev.mother_phone,
        familyContactAddress: family?.parent_address ?? prev.familyContactAddress,
        relationName: family?.emergency_contact_name ?? prev.relationName,
        relationPhone: family?.emergency_contact_phone ?? prev.relationPhone,
        relationship: family?.emergency_contact_relationship ?? prev.relationship,
      }));

      setStudentDataReadonly(true);
      setAutoLoaded(true);
    } catch (error) {
      console.warn("Auto check student_code failed:", error);
    } finally {
      setIsCheckingMssv(false);
    }
  }, []);

  useEffect(() => {
    if (!studentCodeFromAuth) return;
    const timer = window.setTimeout(() => {
      void loadStudentData(studentCodeFromAuth);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadStudentData, studentCodeFromAuth]);

  useEffect(() => {
    let ignore = false;

    const syncRegistrationState = async () => {
      if (!ignore) setHasLoadedRegistration(false);
      if (!ignore) setFormData({ ...initialFormData });
      if (!ignore) setDocumentFiles({ ...initialDocumentFiles });
      if (!ignore) setErrors({});
      if (!ignore) setDocumentErrors({});
      if (!ignore) setRegistration(null);
      if (!ignore) setStatus("unregistered");
      if (!ignore) setSubmitError("");
      if (!ignore) setReviewDocumentUrls(initialDocumentPreviewUrls);

      documentFieldConfigs.forEach(({ field }) => {
        if (documentRefs.current[field]) {
          documentRefs.current[field]!.value = "";
        }
      });

      if (!studentEmail) {
        if (!ignore) setHasLoadedRegistration(true);
        return;
      }

      try {
        const [data, eligRes] = await Promise.all([
          getLatestRegistrationByEmail(studentEmail),
          checkEligibility(studentEmail).catch(() => ({ eligible: true } as EligibilityResult)),
        ]);
        if (ignore) return;

        setEligibility(eligRes);
        setRegistration(data);

        if (eligRes.reason_code === 'no_open_channel') {
          getRegistrationPeriods()
            .then(setPeriodsForStatus)
            .catch(() => setPeriodsForStatus([]));
        }

        // Không đủ điều kiện đăng ký mới: ở lại trang này, hiển thị lý do + toàn bộ lịch sử
        // đăng ký thay vì điều hướng đi nơi khác (trước đây redirect sang room-status/room
        // mà không giải thích gì, gây khó hiểu cho sinh viên).
        if (!eligRes.eligible) {
          setIsLoadingHistory(true);
          getMyRegistrationHistory(studentEmail)
            .then((history) => { if (!ignore) setRegistrationHistory(history); })
            .catch(() => { if (!ignore) setRegistrationHistory([]); })
            .finally(() => { if (!ignore) setIsLoadingHistory(false); });
        }

        if (!data) {
          setStatus("unregistered");
          setReviewDocumentUrls(initialDocumentPreviewUrls);
          return;
        }

        // Resubmit flow: rejected + ?resubmit=true → show form prefilled with old data
        if (isResubmit && data.status === "rejected") {
          setStatus("unregistered");
          // Hồ sơ cũ lưu birthDate/cccdIssueDate dạng YYYY-MM-DD (từ cột DATE) — phải đổi
          // sang dd/mm/yyyy trước khi đổ vào form, nếu không dính lỗi validate ngay khi
          // resubmit dù người dùng chưa động vào field nào (xem dateRegex/dateFieldNames).
          const toDdMmYyyy = (val?: string) => {
            if (!val) return val;
            const parts = val.split("-");
            return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : val;
          };
          const oldFormData = data.formData ?? {};
          setFormData({
            ...initialFormData,
            ...oldFormData,
            ...(oldFormData.birthDate ? { birthDate: toDdMmYyyy(oldFormData.birthDate) } : {}),
            ...(oldFormData.cccdIssueDate ? { cccdIssueDate: toDdMmYyyy(oldFormData.cccdIssueDate) } : {}),
          });
          setDocumentFiles({ ...initialDocumentFiles });
          setReviewDocumentUrls({
            portraitPhoto: buildImageUrl(data.avatarUrl || data.documents?.portraitPhoto),
            cccdFrontPhoto: buildImageUrl(data.cccdFrontUrl || data.documents?.cccdFrontPhoto),
            cccdBackPhoto: buildImageUrl(data.cccdBackUrl || data.documents?.cccdBackPhoto),
          });
          return;
        }

        setStatus("unregistered");
      } catch (error) {
        console.error('[RegistrationPage] Error loading registration:', error);
        if (!ignore) setEligibility({ eligible: true });
      } finally {
        if (!ignore) setHasLoadedRegistration(true);
      }
    };

    void syncRegistrationState();
    return () => { ignore = true; };
  }, [studentEmail, isResubmit]);




  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error("Không thể đọc tệp ảnh."));
      };
      reader.onerror = () => {
        reject(new Error("Không thể đọc tệp ảnh."));
      };
      reader.readAsDataURL(file);
    });

  const analyzeBlur = (file: File): Promise<BlurLevel> =>
    new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (img.width < 100 || img.height < 100) { resolve('small'); return; }
        const MAX = 200;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.floor(img.width * scale));
        const h = Math.max(1, Math.floor(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve('ok'); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const gray: number[] = [];
        for (let i = 0; i < data.length; i += 4) {
          gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
        let sumSq = 0; let count = 0;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            const lap = -4 * gray[idx] + gray[idx - 1] + gray[idx + 1] + gray[idx - w] + gray[idx + w];
            sumSq += lap * lap; count++;
          }
        }
        const variance = count > 0 ? sumSq / count : 0;
        resolve(variance >= 100 ? 'ok' : variance >= 50 ? 'warn' : 'blur');
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve('ok'); };
      img.src = url;
    });

  const toDataUrl = async (file: File) => {
    if (file.size <= 350 * 1024) {
      return readFileAsDataUrl(file);
    }

    const originalDataUrl = await readFileAsDataUrl(file);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Không thể xử lý tệp ảnh."));
      img.src = originalDataUrl;
    });

    const maxSide = 1280;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      return originalDataUrl;
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.72);
    });

    if (!compressedBlob) {
      return originalDataUrl;
    }

    return readFileAsDataUrl(new File([compressedBlob], file.name, { type: "image/jpeg" }));
  };

  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const [header, base64] = dataUrl.split(",");
    const mimeMatch = header.match(/data:(.*);base64/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], filename, { type: mime });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof FormData;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => {
      if (!prev[fieldName]) {
        return prev;
      }
      const nextErrors = { ...prev };
      delete nextErrors[fieldName];
      return nextErrors;
    });
  };

  const setDocumentFile = (fieldName: DocumentField, nextFile: File) => {
    const clearRejectedDocument = (message: string) => {
      setDocumentFiles((prev) => ({ ...prev, [fieldName]: null }));
      setBlurStatus((prev) => ({ ...prev, [fieldName]: null }));
      setDocumentErrors((prev) => ({ ...prev, [fieldName]: message }));
      if (documentRefs.current[fieldName]) {
        documentRefs.current[fieldName]!.value = "";
      }
    };

    if (!acceptedDocumentTypes.has(nextFile.type)) {
      clearRejectedDocument("Ảnh phải có định dạng JPG, JPEG, PNG hoặc WEBP.");
      return;
    }

    if (nextFile.size > maxDocumentFileSize) {
      clearRejectedDocument("Ảnh vượt quá 2 MB. Vui lòng chọn ảnh có dung lượng nhỏ hơn.");
      return;
    }

    setDocumentErrors((prev) => { const n = { ...prev }; delete n[fieldName]; return n; });
    setBlurStatus((prev) => ({ ...prev, [fieldName]: 'analyzing' }));

    void analyzeBlur(nextFile).then((result) => {
      if (result === 'blur') {
        setBlurStatus((prev) => ({ ...prev, [fieldName]: 'blur' }));
        setDocumentErrors((prev) => ({ ...prev, [fieldName]: 'Ảnh quá mờ, không thể nhận dạng. Vui lòng chụp lại trong điều kiện đủ sáng.' }));
        if (documentRefs.current[fieldName]) documentRefs.current[fieldName]!.value = '';
      } else if (result === 'small') {
        setBlurStatus((prev) => ({ ...prev, [fieldName]: 'small' }));
        setDocumentErrors((prev) => ({ ...prev, [fieldName]: 'Ảnh quá nhỏ, vui lòng dùng ảnh chất lượng cao hơn.' }));
        if (documentRefs.current[fieldName]) documentRefs.current[fieldName]!.value = '';
      } else if (result === 'warn') {
        setPendingBlurFile({ field: fieldName, file: nextFile });
        setBlurWarnField(fieldName);
        setBlurStatus((prev) => ({ ...prev, [fieldName]: 'warn' }));
      } else {
        setBlurStatus((prev) => ({ ...prev, [fieldName]: 'ok' }));
        setDocumentFiles((prev) => ({ ...prev, [fieldName]: nextFile }));
      }
    });
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fieldName = e.target.name as DocumentField;
    const nextFile = e.target.files?.[0];
    if (!nextFile) {
      return;
    }
    setDocumentFile(fieldName, nextFile);
  };

  const handleDocumentDragOver = (fieldName: DocumentField, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (draggingDocumentField !== fieldName) {
      setDraggingDocumentField(fieldName);
    }
  };

  const handleDocumentDragLeave = (fieldName: DocumentField, e: React.DragEvent<HTMLDivElement>) => {
    const relatedTarget = e.relatedTarget;
    if (relatedTarget instanceof Node && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    if (draggingDocumentField === fieldName) {
      setDraggingDocumentField(null);
    }
  };

  const handleDocumentDrop = (fieldName: DocumentField, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDraggingDocumentField(null);
    const nextFile = e.dataTransfer.files?.[0];
    if (!nextFile) {
      return;
    }
    setDocumentFile(fieldName, nextFile);
  };

  const handleMssvBlur = async () => {
    const code = formData.mssv?.trim();
    if (!code) return;

    setIsCheckingMssv(true);
    try {
      const res = await checkStudentCodeExists(code);
      const exists = res?.exists ?? false;

        if (!exists) {
        setErrors((prev) => ({ ...prev, mssv: "MSSV sai. Vui lòng nhập MSSV đã đăng ký." }));
        if (!autoLoaded) setStudentDataReadonly(false);
      } else {
        setErrors((prev) => {
          if (!prev.mssv) return prev;
          const copy = { ...prev };
          delete copy.mssv;
          return copy;
        });

        // Nếu server trả student, map vào form và set readonly
        const student = res.student;
        if (student) {
          
          const mapDate = (val?: string) => {
            if (!val) return "";
            // expect YYYY-MM-DD -> dd/mm/yyyy
            const parts = val.split("-");
            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
            return val;
          };

          setFormData((prev) => ({
            ...prev,
            mssv: student.student_code ?? code,
            fullName: student.full_name ?? prev.fullName,
            birthDate: mapDate(student.date_of_birth),
            gender: student.gender ?? prev.gender,
            class: student.class_name ?? prev.class,
            department: student.faculty ?? prev.department,
            nationality: student.nationality ?? prev.nationality,
            ethnicity: student.ethnicity ?? prev.ethnicity,
            religion: student.religion ?? prev.religion,
            phone: student.phone ?? prev.phone,
            cccd: student.cccd ?? prev.cccd,
            cccdIssueDate: mapDate(student.cccd_issued_date),
            cccdIssuePlace: student.cccd_issued_place ?? prev.cccdIssuePlace,
            address: student.permanent_address ?? prev.address,
          }));

          setStudentDataReadonly(true);
          setAutoLoaded(true);
        }
      }
    } catch {
      setErrors((prev) => ({ ...prev, mssv: "Không thể kiểm tra MSSV. Vui lòng thử lại." }));
    } finally {
      setIsCheckingMssv(false);
    }
  };

  

  const openDocumentPicker = (fieldName: DocumentField) => {
    documentRefs.current[fieldName]?.click();
  };

  const clearDocumentInputs = () => {
    documentFieldConfigs.forEach(({ field }) => {
      const input = documentRefs.current[field];
      if (input) input.value = "";
    });
    setDraggingDocumentField(null);
    setBlurStatus({ ...initialBlurStatus });
    setBlurWarnField(null);
    setPendingBlurFile(null);
  };

  const handlePhoneBlur = () => {
    const value = formData.phone.trim();
    if (!value) {
      return;
    }
    if (!phoneRegex.test(value)) {
      setErrors((prev) => ({
        ...prev,
        phone: "Số điện thoại phải gồm đúng 10 chữ số.",
      }));
    }
  };

  const handleCccdBlur = () => {
    const value = formData.cccd.trim();
    if (!value) {
      return;
    }
    if (!cccdRegex.test(value)) {
      setErrors((prev) => ({
        ...prev,
        cccd: "Số CCCD phải gồm đúng 12 chữ số.",
      }));
    }
  };

  const validateDateField = (fieldName: keyof FormData) => {
    const value = formData[fieldName].trim();
    if (!value) {
      return;
    }
    if (!dateRegex.test(value)) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: "Ngày tháng phải theo định dạng dd/mm/yyyy.",
      }));
    }
  };

  /**
   * Cuộn + focus tới field/ảnh lỗi đầu tiên theo đúng thứ tự hiển thị trên form
   * (formFieldLabels đã được khai báo theo đúng thứ tự các mục trên giao diện).
   * Trả về true nếu đã tìm và cuộn tới được 1 field/ảnh cụ thể.
   */
  const scrollToFirstInvalid = (
    fieldErrorsObj: Partial<Record<keyof FormData, string>>,
    documentErrorsObj: Partial<Record<DocumentField, string>>,
  ): boolean => {
    const orderedFields = Object.keys(formFieldLabels) as RequiredRegistrationField[];
    const firstInvalidField = orderedFields.find((field) => fieldErrorsObj[field]);
    if (firstInvalidField) {
      fieldRefs.current[firstInvalidField]?.focus();
      fieldRefs.current[firstInvalidField]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return true;
    }

    const firstInvalidDocument = documentFieldConfigs.find(({ field }) => documentErrorsObj[field]);
    if (firstInvalidDocument) {
      documentRefs.current[firstInvalidDocument.field]?.focus();
      documentRefs.current[firstInvalidDocument.field]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return true;
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    const requiredFields = Object.keys(formFieldLabels) as RequiredRegistrationField[];
    const nextErrors: Partial<Record<keyof FormData, string>> = {};
    const nextDocumentErrors: Partial<Record<DocumentField, string>> = {};
    let commitmentError = "";

    for (const field of requiredFields) {
      // Field cha/mẹ/liên hệ khẩn cấp đang readonly (đã có sẵn từ students) thì bỏ qua
      // bắt buộc ở đây — giá trị chắc chắn có sẵn, không phải do người dùng vừa xóa trống.
      if (prefilledFamilyFieldNames.has(field)) {
        continue;
      }
      if (!formData[field].trim()) {
        nextErrors[field] = `Vui lòng điền ${formFieldLabels[field]}`;
        continue;
      }
      if (dateFieldNames.includes(field) && !dateRegex.test(formData[field].trim())) {
        nextErrors[field] = `Ngày tháng phải theo định dạng dd/mm/yyyy.`;
        continue;
      }
      if (nameFieldNames.includes(field)) {
        const trimmedName = formData[field].trim();
        if (trimmedName.length < 2) {
          nextErrors[field] = `${formFieldLabels[field]} phải có ít nhất 2 ký tự.`;
        } else if (!nameRegex.test(trimmedName)) {
          nextErrors[field] = `${formFieldLabels[field]} chỉ được chứa chữ cái và khoảng trắng.`;
        }
      }
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!phoneRegex.test(formData.phone.trim())) {
      nextErrors.phone = "Số điện thoại phải gồm đúng 10 chữ số.";
    }

    if (!prefilledFamilyFieldNames.has("father_phone")) {
      if (!formData.father_phone.trim()) {
        nextErrors.father_phone = "Vui lòng nhập số điện thoại cha.";
      } else if (!phoneRegex.test(formData.father_phone.trim())) {
        nextErrors.father_phone = "Số điện thoại cha phải gồm đúng 10 chữ số.";
      }
    }

    if (!prefilledFamilyFieldNames.has("mother_phone")) {
      if (!formData.mother_phone.trim()) {
        nextErrors.mother_phone = "Vui lòng nhập số điện thoại mẹ.";
      } else if (!phoneRegex.test(formData.mother_phone.trim())) {
        nextErrors.mother_phone = "Số điện thoại mẹ phải gồm đúng 10 chữ số.";
      }
    }

    if (!prefilledFamilyFieldNames.has("relationPhone")) {
      if (!formData.relationPhone.trim()) {
        nextErrors.relationPhone = "Vui lòng nhập SĐT người liên hệ.";
      } else if (!phoneRegex.test(formData.relationPhone.trim())) {
        nextErrors.relationPhone = "Số điện thoại liên hệ phải gồm đúng 10 chữ số.";
      }
    }

    if (!formData.cccd.trim()) {
      nextErrors.cccd = "Vui lòng nhập số CCCD.";
    } else if (!cccdRegex.test(formData.cccd.trim())) {
      nextErrors.cccd = "Số CCCD phải gồm đúng 12 chữ số.";
    }

    

    for (const { field } of documentFieldConfigs) {
      if (!documentFiles[field]) {
        nextDocumentErrors[field] = `Vui lòng tải lên ${documentLabels[field]}`;
      }
    }

    if (!commitmentConfirmed) {
      commitmentError = "Vui lòng xác nhận cam kết trước khi đăng ký.";
    }

    // Đã chọn diện ưu tiên thì bắt buộc phải có ít nhất 1 ảnh minh chứng
    const nextEvidenceErrors: Record<number, string> = {};
    for (const criteriaId of selectedCriteriaIds) {
      const files = evidenceFiles[criteriaId];
      if (!files || files.length === 0) {
        nextEvidenceErrors[criteriaId] = "Vui lòng tải lên minh chứng cho diện ưu tiên đã chọn";
      }
    }
    const hasMissingEvidence = Object.keys(nextEvidenceErrors).length > 0;

    const hasRejectedImage = documentFieldConfigs.some(({ field }) =>
      blurStatus[field] === 'blur' || blurStatus[field] === 'small'
    );
    if (hasRejectedImage) {
      setSubmitError('Có ảnh không đạt yêu cầu chất lượng. Vui lòng chọn lại ảnh rõ nét hơn.');
      return;
    }

    if (Object.keys(nextErrors).length > 0 || Object.keys(nextDocumentErrors).length > 0 || commitmentError || hasMissingEvidence) {
      setErrors(nextErrors);
      setDocumentErrors(nextDocumentErrors);
      if (hasMissingEvidence) {
        setEvidenceErrors((prev) => ({ ...prev, ...nextEvidenceErrors }));
        if (!commitmentError) {
          setSubmitError("Vui lòng tải lên minh chứng cho các diện ưu tiên đã chọn.");
        }
      }
      if (commitmentError) {
        setSubmitError(commitmentError);
      }

      if (scrollToFirstInvalid(nextErrors, nextDocumentErrors)) {
        return;
      }

      if (hasMissingEvidence) {
        const firstMissingId = selectedCriteriaIds.find((id) => nextEvidenceErrors[id]);
        if (firstMissingId != null) {
          criteriaRefs.current[firstMissingId]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          return;
        }
      }

      // Không có field/ảnh cụ thể nào để cuộn tới (vd. chỉ thiếu xác nhận cam kết)
      // → cuộn lên đầu trang để admin thấy ngay banner lỗi.
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setErrors({});
    setDocumentErrors({});

    if (!studentEmail) {
      setSubmitError("Bạn cần đăng nhập tài khoản sinh viên để gửi đơn.");
      return;
    }

    const allDocumentsReady = documentFieldConfigs.every(({ field }) => documentFiles[field]);
    if (!allDocumentsReady) {
      return;
    }

    setIsSubmitting(true);

    try {
      const [portraitDataUrl, cccdFrontDataUrl, cccdBackDataUrl] = await Promise.all([
        toDataUrl(documentFiles.portraitPhoto as File),
        toDataUrl(documentFiles.cccdFrontPhoto as File),
        toDataUrl(documentFiles.cccdBackPhoto as File),
      ]);

      const compressedPortrait = dataUrlToFile(portraitDataUrl, (documentFiles.portraitPhoto as File).name);
      const compressedCccdFront = dataUrlToFile(cccdFrontDataUrl, (documentFiles.cccdFrontPhoto as File).name);
      const compressedCccdBack = dataUrlToFile(cccdBackDataUrl, (documentFiles.cccdBackPhoto as File).name);

      const form = new FormData();

      form.append("email", studentEmail);
      form.append("semester", "2024-2025");

      form.append("student_code", formData.mssv);
      form.append("full_name", formData.fullName);
      form.append("date_of_birth", formData.birthDate);
      form.append("gender", formData.gender);
      form.append("class_name", formData.class);
      form.append("faculty", formData.department);
      form.append("course_year", formData.class);
      form.append("phone", formData.phone);
      form.append("cccd", formData.cccd);
      form.append("cccd_issued_date", formData.cccdIssueDate);
      form.append("cccd_issued_place", formData.cccdIssuePlace);
      form.append("nationality", formData.nationality);
      form.append("ethnicity", formData.ethnicity);
      form.append("religion", formData.religion);
      form.append("permanent_address", formData.address);

      form.append("emergency_contact_name", formData.relationName);
      form.append("emergency_contact_phone", formData.relationPhone);
      form.append("emergency_contact_relationship", formData.relationship);

      form.append("father_name", formData.father_name);
      form.append("father_phone", formData.father_phone);
      form.append("father_job", formData.father_job);
      form.append("mother_name", formData.mother_name);
      form.append("mother_phone", formData.mother_phone);
      form.append("mother_job", formData.mother_job);
      form.append("parent_address", formData.familyContactAddress || formData.address || "");


      form.append("commitment_confirmed", commitmentConfirmed ? "true" : "false");
      form.append("commitment_confirm", commitmentConfirmed ? "1" : "0");

      if (selectedCriteriaIds.length > 0) {
        for (const id of selectedCriteriaIds) {
          form.append("priority_criteria_ids[]", String(id));
          const files = evidenceFiles[id];
          if (files && files.length > 0) {
            const filesToUpload = files.slice(0, MAX_EVIDENCE_FILES);
            const compressedFiles = await Promise.all(
              filesToUpload.map(async (file) => {
                if (file.type === "application/pdf") {
                  return file;
                }
                const dataUrl = await toDataUrl(file);
                return dataUrlToFile(dataUrl, file.name);
              }),
            );
            compressedFiles.forEach((file) => {
              form.append(`priority_evidence_${id}[]`, file);
            });
          }
        }
      }

      form.append("current_address", formData.current_address || "");
      form.append("father_birth_year", formData.father_birth_year || "");
      form.append("mother_birth_year", formData.mother_birth_year || "");

      form.append("avatar", compressedPortrait);
      form.append("cccd_front", compressedCccdFront);
      form.append("cccd_back", compressedCccdBack);

      const res = await submitRegistration(form);

      if (!res) {
        setSubmitError("Không thể gửi đơn. Vui lòng thử lại.");
        return;
      }

      navigate("/student/room-status");
    } catch (error) {
      if (error && typeof error === "object" && "response" in error) {
        const response = (error as { response?: { data?: Record<string, unknown> } }).response;
        const responseData = response?.data;

        if (responseData) {
          const responseErrors = responseData.errors as Record<string, unknown> | undefined;
          const nextDocumentErrors: Partial<Record<DocumentField, string>> = {};
          const nextFieldErrors: Partial<Record<keyof FormData, string>> = {};

          if (responseErrors) {
            Object.entries(uploadFieldToDocumentField).forEach(([uploadField, documentField]) => {
              const rawMessages = responseErrors[uploadField];
              const firstMessage = Array.isArray(rawMessages) ? rawMessages[0] : rawMessages;

              if (typeof firstMessage !== "string") {
                return;
              }

              nextDocumentErrors[documentField] = firstMessage.toLowerCase().includes("failed to upload")
                ? `Không thể tải ${documentLabels[documentField].toLowerCase()} lên. Vui lòng kiểm tra dung lượng ảnh không vượt quá 2 MB rồi chọn lại.`
                : firstMessage;
            });

            Object.entries(backendFieldToFormField).forEach(([backendField, formField]) => {
              const rawMessages = responseErrors[backendField];
              const firstMessage = Array.isArray(rawMessages) ? rawMessages[0] : rawMessages;

              if (typeof firstMessage === "string" && formField) {
                nextFieldErrors[formField] = firstMessage;
              }
            });
          }

          if (Object.keys(nextFieldErrors).length > 0 || Object.keys(nextDocumentErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...nextFieldErrors }));
            setDocumentErrors((prev) => ({ ...prev, ...nextDocumentErrors }));
            setSubmitError(
              Object.keys(nextDocumentErrors).length > 0
                ? "Vui lòng kiểm tra lại lỗi tại phần hồ sơ ảnh đính kèm."
                : Object.values(nextFieldErrors)[0] ?? "Vui lòng kiểm tra lại thông tin đã điền.",
            );

            if (!scrollToFirstInvalid(nextFieldErrors, nextDocumentErrors)) {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
            return;
          }

          const message = responseData.message;
          if (typeof message === "string") {
            setSubmitError(message);
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }

          const validationMessages = responseErrors
            ? Object.values(responseErrors).flat().filter(Boolean)
            : [];

          if (validationMessages.length > 0) {
            setSubmitError(String(validationMessages[0]));
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
        }
      }

      setSubmitError(error instanceof Error ? error.message : "Không thể gửi đơn. Vui lòng thử lại.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  function resetFormState() {
    setFormData({ ...initialFormData });
    setDocumentFiles({ ...initialDocumentFiles });
    setErrors({});
    setDocumentErrors({});
    setCommitmentConfirmed(false);
    clearDocumentInputs();
  }

  const handleClearForm = () => {
    resetFormState();
    requestAnimationFrame(() => {
      const scrollContainer = formRef.current?.closest(".auth-scrollbar");
      if (scrollContainer instanceof HTMLElement) {
        scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const getFieldClassName = (hasError = false) =>
    `mt-1 h-11 w-full rounded-xl border ${hasError ? "border-red-400" : "border-[#D6E2F1]"} bg-[#F6F9FD] px-4 text-sm text-[#1F3152] placeholder:text-[#90A2BF] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-all duration-300 ease-out ${hasError ? "hover:border-red-400" : "hover:border-[#B9CDEE]"} hover:bg-white hover:shadow-[0_14px_28px_rgba(36,76,184,0.10)] focus:bg-white focus:outline-none ${hasError ? "focus:border-red-500 focus:ring-4 focus:ring-red-500/14" : "focus:border-[#244CB8] focus:ring-4 focus:ring-[#244CB8]/14"}`;

  const getStep2FieldClassName = (hasError = false) => getFieldClassName(hasError);

  const renderFormField = (config: FormFieldConfig) => {
    const isRequired = true;
    const fieldValue = formData[config.name];
    const isDateField = dateFieldNames.includes(config.name);
    const hasError = Boolean(errors[config.name]);
    const className = config.type === "select" ? getStep2FieldClassName(hasError) : getFieldClassName(hasError);
    const fieldId = `registration-${String(config.name)}`;

    const prefilledFieldNames = new Set<keyof FormData>([
      "mssv",
      "fullName",
      "birthDate",
      "gender",
      "class",
      "department",
      "nationality",
      "ethnicity",
      "religion",
      "phone",
      "cccd",
      "cccdIssueDate",
      "cccdIssuePlace",
      "address",
    ]);
    const isPrefilled = (
      (
        studentDataReadonly ||
        autoLoaded ||
        Boolean(studentCodeFromAuth && formData.mssv && studentCodeFromAuth === formData.mssv)
      ) && prefilledFieldNames.has(config.name)
    ) || prefilledFamilyFieldNames.has(config.name);

    // If MSSV was auto-loaded from auth, hide the visible MSSV field but keep a hidden input for submission
    if (config.name === "mssv" && (studentDataReadonly || (studentCodeFromAuth && studentCodeFromAuth === formData.mssv))) {
      return (
        <div key={String(config.name)} className={config.fullWidth ? "md:col-span-2" : ""}>
          <label htmlFor={fieldId} className="block text-sm font-medium text-[#5A7094]">
            {config.label} {isRequired ? <span className="text-red-500">*</span> : null}
          </label>
          <input
            id={fieldId}
            type="text"
            name="mssv_display"
            value={formData.mssv}
            className={className}
            disabled
            tabIndex={-1}
            aria-readonly="true"
            readOnly
          />
          <input type="hidden" name="mssv" value={formData.mssv} />
        </div>
      );
    }

    return (
      <div key={String(config.name)} className={config.fullWidth ? "md:col-span-2" : ""}>
        <label htmlFor={fieldId} className="block text-sm font-medium text-[#5A7094]">
          {config.label} {isRequired ? <span className="text-red-500">*</span> : null}
        </label>
        {config.type === "select" ? (
          <select
            id={fieldId}
            name={String(config.name)}
            value={fieldValue}
            onChange={handleInputChange}
            ref={(node) => {
              fieldRefs.current[config.name] = node;
            }}
            className={className}
            disabled={isPrefilled}
          >
            <option value="">{config.placeholder ?? `Chọn ${config.label.toLowerCase()}`}</option>
            {config.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input
              id={fieldId}
              type={isDateField ? "text" : config.type ?? "text"}
              name={String(config.name)}
              value={fieldValue}
              onChange={handleInputChange}
              onBlur={isDateField ? () => validateDateField(config.name) : config.onBlur}
              inputMode={isDateField ? "numeric" : config.type === "tel" ? "numeric" : undefined}
              maxLength={isDateField ? 10 : undefined}
              ref={(node) => {
                fieldRefs.current[config.name] = node;
              }}
              placeholder={isDateField ? "dd/mm/yyyy" : config.placeholder}
              className={className}
              disabled={isPrefilled}
              tabIndex={isPrefilled ? -1 : undefined}
            />
            {config.name === "mssv" && studentDataReadonly && (
              <div className="mt-2">
                <span className="text-sm text-[#2f63da]">Dữ liệu đã lấy từ hồ sơ sinh viên (readonly)</span>
              </div>
            )}
          </>
        )}
        {config.helperText ? <p className="mt-1 text-xs text-[#6F89B5]">{config.helperText}</p> : null}
        {errors[config.name] ? <ErrorMessage message={errors[config.name] as string} /> : null}
      </div>
    );
  };

  const studentInfoFields: FormFieldConfig[] = [
    { name: "mssv", label: "MSSV", placeholder: "Ví dụ: Nhập MSSV", required: true, onBlur: handleMssvBlur, helperText: isCheckingMssv ? "Đang kiểm tra MSSV..." : undefined },
    { name: "fullName", label: "Họ và tên", placeholder: "Nhập họ và tên", required: true },
    { name: "birthDate", label: "Ngày sinh", required: true },
    {
      name: "gender",
      label: "Giới tính",
      type: "select",
      placeholder: "Chọn giới tính",
      options: genderOptions,
      required: true,
    },
    { name: "class", label: "Lớp", placeholder: "Ví dụ: D22_TH01", required: true },
    { name: "department", label: "Khoa", type: "select", placeholder: "Chọn khoa", options: departmentOptions.map((department) => ({ value: department, label: department })), required: true },
    { name: "nationality", label: "Quốc tịch", placeholder: "Ví dụ: Việt Nam", required: true },
    { name: "ethnicity", label: "Dân tộc", placeholder: "Ví dụ: Kinh", required: true },
    { name: "religion", label: "Tôn giáo", placeholder: "Ví dụ: Không", required: true },
  ];

  const identityFields: FormFieldConfig[] = [
    { name: "phone", label: "Số điện thoại", type: "tel", placeholder: "Nhập số điện thoại ", required: true, onBlur: handlePhoneBlur },
    { name: "cccd", label: "Số CCCD", placeholder: "Nhập số CCCD", required: true, onBlur: handleCccdBlur },
    { name: "cccdIssueDate", label: "Ngày cấp", required: true },
    { name: "cccdIssuePlace", label: "Nơi cấp", placeholder: "Nhập nơi cấp", required: true },
    { name: "address", label: "Địa chỉ thường trú", placeholder: "Nhập địa chỉ thường trú", required: true, fullWidth: true },
    { name: "current_address", label: "Địa chỉ hiện tại", placeholder: "Nhập địa chỉ đang ở hiện tại", required: true, fullWidth: true },
  ];

  const familyFields: FormFieldConfig[] = [
    { name: "father_name", label: "Họ tên cha", placeholder: "Nhập họ tên cha", required: true },
    { name: "father_birth_year", label: "Năm sinh cha", placeholder: "Ví dụ: 1975", required: true },
    { name: "father_phone", label: "SĐT cha", type: "tel", placeholder: "Số điện thoại cha", required: true },
    { name: "father_job", label: "Nghề nghiệp cha", placeholder: "Nhập nghề nghiệp cha", required: true },
    { name: "mother_name", label: "Họ tên mẹ", placeholder: "Nhập họ tên mẹ", required: true },
    { name: "mother_birth_year", label: "Năm sinh mẹ", placeholder: "Ví dụ: 1978", required: true },
    { name: "mother_phone", label: "SĐT mẹ", type: "tel", placeholder: "Số điện thoại mẹ", required: true },
    { name: "mother_job", label: "Nghề nghiệp mẹ", placeholder: "Nhập nghề nghiệp mẹ", required: true },
    { name: "familyContactAddress", label: "Địa chỉ liên hệ cha/mẹ", placeholder: "Nhập địa chỉ liên hệ", fullWidth: true, required: true },
    { name: "relationName", label: "Người liên hệ khẩn cấp", placeholder: "Nhập tên người liên hệ", required: true },
    { name: "relationPhone", label: "SĐT người liên hệ", type: "tel", placeholder: "Nhập số điện thoại", required: true },
    { name: "relationship", label: "Quan hệ", type: "select", placeholder: "Chọn quan hệ", options: relationshipOptions, required: true },
  ];

  const stayInfo = eligibility?.channel_info;
  const eligibilityReasonCode = eligibility?.reason_code ?? "";

  if (!hasLoadedRegistration && studentEmail) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative isolate flex min-h-[calc(100vh-5rem-28px)] flex-col items-center justify-center rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        <div className="flex h-40 w-full max-w-3xl flex-col items-center justify-center rounded-3xl bg-white/80 p-6 text-center shadow-[0_20px_60px_rgba(36,76,184,0.12)] backdrop-blur-sm">
          <LoaderCircle className="mb-3 h-8 w-8 animate-spin text-[#244CB8]" />
          <p className="text-sm font-medium text-[#1F3152]">Đang tải trạng thái đăng ký...</p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative isolate flex min-h-[calc(100vh-5rem-28px)] flex-col space-y-6 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[24px]">
        <div className="absolute -left-24 -top-24 h-56 w-56 rounded-full bg-[#244CB8]/14 blur-3xl" />
        <div className="absolute -bottom-28 right-0 h-60 w-60 rounded-full bg-[#4F7FF1]/14 blur-3xl" />
      </div>

      <motion.div
        transition={{ duration: 0.2 }}
        className="auth-reveal is-visible rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-sm transition-all duration-300 ease-out hover:shadow-[0_24px_56px_rgba(36,76,184,0.14)] sm:px-8"
      >
        <h1 className="text-[30px] font-bold tracking-tight text-[#1A2D52]">Đăng ký nội trú</h1>
        <p className="mt-1.5 text-sm text-[#5C7094]">
          Hoàn thành biểu mẫu để gửi yêu cầu đăng ký nội trú. Hệ thống sẽ xét duyệt đơn của bạn
          trong vòng 3-5 ngày làm việc.
        </p>
      </motion.div>

      {eligibility && !eligibility.eligible ? (
        <div className="auth-reveal is-visible mx-auto w-full max-w-2xl space-y-6">
          {registration ? (
            <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-[#1A2D52]">Trạng thái đơn gần nhất</h2>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${statusMap[registration.status].className}`}
                >
                  {statusMap[registration.status].label}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[#6f84ad]">Loại đơn</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-[#1b3766]">
                    {(registration.registration_type && registrationTypeLabel[registration.registration_type]) || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[#6f84ad]">Đợt đăng ký</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-[#1b3766]">{registration.period_name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[#6f84ad]">Ngày nộp</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-[#1b3766]">{formatDate(registration.submittedAt)}</dd>
                </div>
                {registration.approved_at ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#6f84ad]">Ngày duyệt</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-[#1b3766]">{formatDate(registration.approved_at)}</dd>
                  </div>
                ) : null}
              </dl>
              {registration.status === "rejected" && registration.rejectionReason ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <span className="font-bold">Lý do từ chối:</span> {registration.rejectionReason}
                </div>
              ) : null}
            </div>
          ) : null}

          {(() => {
            const rc = eligibilityReasonCode;

            // ── no_open_channel ──
            if (rc === "no_open_channel") {
              const pending = periodsForStatus?.find(p => p.status === "pending");
              const processing = periodsForStatus?.find(p => p.status === "processing");

              if (periodsForStatus === null) {
                return (
                  <div className="flex items-center justify-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-amber-700">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-medium">Đang kiểm tra lịch đăng ký...</span>
                  </div>
                );
              }
              if (pending) {
                return (
                  <div className="rounded-2xl border border-amber-200 bg-[linear-gradient(180deg,#fffdf3_0%,#fff7db_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-8 sm:py-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-600">
                        <Clock className="h-6 w-6" />
                      </span>
                      <div>
                        <h2 className="text-xl font-bold text-amber-900">Chưa đến thời gian đăng ký</h2>
                        <p className="mt-2 text-sm leading-6 text-amber-800">
                          Đợt <strong>{pending.name}</strong> sẽ mở nhận đơn từ <strong>{formatDate(pending.start_date)}</strong> đến <strong>{formatDate(pending.end_date)}</strong>.<br />
                          Vui lòng quay lại vào ngày <strong>{formatDate(pending.start_date)}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              if (processing) {
                return (
                  <div className="rounded-2xl border border-amber-200 bg-[linear-gradient(180deg,#fffdf3_0%,#fff7db_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-8 sm:py-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-600">
                        <Loader2 className="h-6 w-6" />
                      </span>
                      <div>
                        <h2 className="text-xl font-bold text-amber-900">Đợt đăng ký đang trong quá trình xét duyệt</h2>
                        <p className="mt-2 text-sm leading-6 text-amber-800">
                          Đợt <strong>{processing.name}</strong> đã kết thúc nhận đơn và đang được xét duyệt. Vui lòng chờ kết quả.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:px-8 sm:py-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-500">
                      <CalendarDays className="h-6 w-6" />
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-slate-700">Hiện chưa có đợt đăng ký nào</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Vui lòng theo dõi thông báo từ Ban quản lý để biết thời gian mở đợt tiếp theo.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // ── has_active_application ──
            if (rc === "has_active_application") return (
              <div className="rounded-2xl border border-[#b7ccef] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-8 sm:py-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#c6d8f4] bg-[#eef5ff] text-[#2f63da]">
                    <FileCheck className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-[#1F3152]">Bạn đã có đơn đang xử lý</h2>
                    <p className="mt-2 text-sm leading-6 text-[#5C7094]">Đơn đăng ký của bạn đang được xem xét. Vui lòng chờ kết quả.</p>
                    <button type="button" onClick={() => navigate("/student/room-status")}
                      className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(36,76,184,0.22)] transition hover:-translate-y-0.5 hover:brightness-110">
                      <FileCheck className="h-4 w-4" /> Xem trạng thái đơn
                    </button>
                  </div>
                </div>
              </div>
            );

            // ── already_approved ──
            if (rc === "already_approved") return (
              <div className="rounded-2xl border border-emerald-200 bg-[linear-gradient(180deg,#f0fdf8_0%,#e6faf3_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-8 sm:py-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-100 text-emerald-600">
                    <CheckCircle className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-emerald-900">Đơn của bạn đã được duyệt</h2>
                    <p className="mt-2 text-sm leading-6 text-emerald-800">Bạn đã có đơn đăng ký được duyệt thành công.</p>
                    <button type="button" onClick={() => navigate("/student/room")}
                      className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#059669_0%,#047857_100%)] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(5,150,105,0.22)] transition hover:-translate-y-0.5 hover:brightness-110">
                      <Home className="h-4 w-4" /> Xem phòng của tôi
                    </button>
                  </div>
                </div>
              </div>
            );

            // ── already_residing ──
            if (rc === "already_residing") return (
              <div className="rounded-2xl border border-emerald-200 bg-[linear-gradient(180deg,#f0fdf8_0%,#e6faf3_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-8 sm:py-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-100 text-emerald-600">
                    <Home className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-emerald-900">Bạn đang lưu trú tại KTX</h2>
                    <p className="mt-2 text-sm leading-6 text-emerald-800">{eligibility.reason_message} Nếu muốn ở tiếp, vui lòng dùng chức năng Gia hạn.</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button type="button" onClick={() => navigate("/student/room")}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#059669_0%,#047857_100%)] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(5,150,105,0.22)] transition hover:-translate-y-0.5 hover:brightness-110">
                        <Home className="h-4 w-4" /> Xem phòng của tôi
                      </button>
                      <button type="button" onClick={() => navigate(eligibility.redirect || "/student/extension")}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(36,76,184,0.22)] transition hover:-translate-y-0.5 hover:brightness-110">
                        <CalendarDays className="h-4 w-4" /> Gia hạn lưu trú
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );

            // ── not_studying ──
            if (rc === "not_studying") return (
              <div className="rounded-2xl border border-red-200 bg-[linear-gradient(180deg,#fff7f7_0%,#fff0f0_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-8 sm:py-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-100 text-red-600">
                    <GraduationCap className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-red-900">Không đủ điều kiện đăng ký</h2>
                    <p className="mt-2 text-sm leading-6 text-red-800">
                      {eligibility.reason_message} Vui lòng liên hệ Ban quản lý KTX nếu có thắc mắc.
                    </p>
                  </div>
                </div>
              </div>
            );

            // ── blacklisted ──
            if (rc === "blacklisted") return (
              <div className="rounded-2xl border border-red-200 bg-[linear-gradient(180deg,#fff7f7_0%,#fff0f0_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-8 sm:py-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-100 text-red-600">
                    <ShieldX className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-red-900">Tài khoản bị hạn chế đăng ký</h2>
                    <p className="mt-2 text-sm leading-6 text-red-800">
                      Tài khoản của bạn không được phép đăng ký nội trú. Vui lòng liên hệ Ban quản lý KTX để biết thêm thông tin.
                    </p>
                  </div>
                </div>
              </div>
            );

            // ── not_eligible_year ──
            if (rc === "not_eligible_year") return (
              <div className="rounded-2xl border border-orange-200 bg-[linear-gradient(180deg,#fff8f0_0%,#fff3e3_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-8 sm:py-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-100 text-orange-600">
                    <CalendarDays className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-orange-900">Không đủ điều kiện đăng ký</h2>
                    <p className="mt-2 text-sm leading-6 text-orange-800">
                      Bạn đã quá thời hạn đào tạo tối đa (6 năm), không thuộc diện được ở KTX.
                    </p>
                  </div>
                </div>
              </div>
            );

            // ── unpaid_bills ──
            if (rc === "unpaid_bills") return (
              <div className="rounded-2xl border border-red-200 bg-[linear-gradient(180deg,#fff7f7_0%,#fff0f0_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-8 sm:py-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-100 text-red-600">
                    <Receipt className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-red-900">Còn hóa đơn chưa thanh toán</h2>
                    <p className="mt-2 text-sm leading-6 text-red-800">Bạn còn hóa đơn chưa thanh toán. Vui lòng thanh toán trước khi đăng ký nội trú.</p>
                    <button type="button" onClick={() => navigate("/student/payment")}
                      className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#dc2626_0%,#b91c1c_100%)] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(220,38,38,0.22)] transition hover:-translate-y-0.5 hover:brightness-110">
                      <Receipt className="h-4 w-4" /> Đi đến thanh toán
                    </button>
                  </div>
                </div>
              </div>
            );

            // ── fallback ──
            return (
              <div className="rounded-2xl border border-red-200 bg-[linear-gradient(180deg,#fff7f7_0%,#fff0f0_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-8 sm:py-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-100 text-red-600">
                    <AlertCircle className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-red-900">Bạn chưa đủ điều kiện đăng ký nội trú</h2>
                    <p className="mt-2 text-sm leading-6 text-red-800">{eligibility.reason_message}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="rounded-[20px] border border-[#c1d6f4] bg-white px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
            <h2 className="text-lg font-bold text-[#1A2D52]">Lịch sử đăng ký</h2>
            {isLoadingHistory ? (
              <p className="mt-4 text-sm text-[#5C7094]">Đang tải lịch sử đăng ký...</p>
            ) : registrationHistory.length === 0 ? (
              <p className="mt-4 text-sm text-[#5C7094]">Bạn chưa từng nộp đơn đăng ký nào.</p>
            ) : (
              <div className="relative mt-4 space-y-3 before:absolute before:left-4 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-[#d8e3f1]">
                {registrationHistory.map((item) => (
                  <article key={item.id} className="relative pl-11">
                    <span className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#d8e3f1] bg-white text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.10)]">
                      <FileCheck className="h-4 w-4" />
                    </span>
                    <div className="rounded-2xl border border-[#e2eaf6] bg-[#f8fbff] px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#62789f]">
                          <CalendarDays className="h-4 w-4" />
                          {formatDate(item.submittedAt)}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${statusMap[item.status].className}`}
                        >
                          {statusMap[item.status].label}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#1b3766]">
                        <span className="font-bold">
                          {(item.registration_type && registrationTypeLabel[item.registration_type]) || "Đăng ký"}
                        </span>
                        {item.period_name ? <> · {item.period_name}</> : null}
                      </p>
                      {item.status === "approved" && item.approved_at ? (
                        <p className="mt-1 text-xs font-semibold text-emerald-700">
                          Đã duyệt ngày {formatDate(item.approved_at)}
                        </p>
                      ) : null}
                      {item.status === "rejected" && item.rejectionReason ? (
                        <p className="mt-1 text-xs font-semibold text-rose-700">
                          Lý do từ chối: {item.rejectionReason}
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {step === 'info' ? (
            /* ── MÀN HÌNH 1: Thông tin đợt đăng ký ── */
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-5"
            >
              {/* Thông tin đợt */}
              {stayInfo && (
                <div className="auth-reveal is-visible rounded-[20px] border border-emerald-200 bg-[linear-gradient(180deg,#f0fdf8_0%,#e6faf3_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <CalendarDays className="h-5 w-5 shrink-0 text-emerald-600" />
                    <h2 className="text-lg font-bold text-emerald-900">
                      {stayInfo.period_name}
                    </h2>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      {stayInfo.channel === 'main' ? 'Đợt chính' : 'Quanh năm'}
                    </span>
                    {stayInfo.status === 'pending' && (
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        Sắp mở
                      </span>
                    )}
                  </div>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {stayInfo.school_year && (
                      <div className="rounded-xl border border-emerald-100 bg-white/70 px-4 py-3">
                        <dt className="text-xs font-medium uppercase tracking-wide text-emerald-600">Năm học / Học kỳ</dt>
                        <dd className="mt-1 text-sm font-semibold text-[#1F3152]">
                          {stayInfo.school_year} — Học kỳ {stayInfo.semester}
                        </dd>
                      </div>
                    )}
                    <div className="rounded-xl border border-emerald-100 bg-white/70 px-4 py-3">
                      <dt className="text-xs font-medium uppercase tracking-wide text-emerald-600">Thời gian nhận đơn</dt>
                      <dd className="mt-1 text-sm font-semibold text-[#1F3152]">
                        {formatDate(stayInfo.start_date)} → {formatDate(stayInfo.end_date)}
                      </dd>
                    </div>
                    {(stayInfo.stay_start_date || stayInfo.stay_end_date) && (
                      <div className="rounded-xl border border-emerald-100 bg-white/70 px-4 py-3">
                        <dt className="text-xs font-medium uppercase tracking-wide text-emerald-600">Thời gian lưu trú</dt>
                        <dd className="mt-1 text-sm font-semibold text-[#1F3152]">
                          {stayInfo.stay_start_date ? formatDate(stayInfo.stay_start_date) : '—'}{' '}
                          → {stayInfo.stay_end_date ? formatDate(stayInfo.stay_end_date) : '—'}
                        </dd>
                      </div>
                    )}
                    <div className="rounded-xl border border-emerald-100 bg-white/70 px-4 py-3 sm:col-span-2">
                      <dt className="text-xs font-medium uppercase tracking-wide text-emerald-600">Xét duyệt</dt>
                      <dd className="mt-1 text-sm text-emerald-700">
                        {stayInfo.channel === 'main'
                          ? 'Đơn sẽ được xét duyệt sau khi hết hạn đợt nhận đơn'
                          : 'Đơn được xét duyệt ngay sau khi nộp (khi còn giường trống)'}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Điều kiện đăng ký */}
              <div className="auth-reveal is-visible rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
                <div className="mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#244CB8]" />
                  <h2 className="text-lg font-bold text-[#1A2D52]">Điều kiện đăng ký</h2>
                </div>
                <ul className="space-y-2.5">
                  {[
                    'Là sinh viên chính quy đang theo học tại trường',
                    'Không thuộc danh sách cấm đăng ký ký túc xá',
                    'Không còn hóa đơn phí phòng hoặc tiền điện chưa thanh toán',
                    'Chưa có đơn đăng ký đang được xử lý trong đợt hiện tại',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-[#324B76]">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#244CB8]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Lưu ý quan trọng */}
              <div className="auth-reveal is-visible flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Lưu ý quan trọng</p>
                  <p className="mt-0.5 text-sm text-amber-700">
                    Đơn sau khi gửi sẽ không thể chỉnh sửa hoặc hủy. Vui lòng kiểm tra kỹ thông tin trước khi nộp.
                  </p>
                </div>
              </div>

              {/* Nút Bắt đầu đăng ký */}
              <div className="flex items-center justify-end gap-3">
                {stayInfo?.status === 'pending' && (
                  <p className="text-sm text-amber-700">
                    Đợt sẽ mở nhận đơn từ <strong>{formatDate(stayInfo.start_date)}</strong>
                  </p>
                )}
                <button
                  type="button"
                  disabled={stayInfo?.status === 'pending'}
                  onClick={() => { setStep('form'); document.querySelector('.auth-scrollbar')?.scrollTo({ top: 0, behavior: 'instant' }); }}
                  className="auth-btn-gloss inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-7 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_22px_40px_rgba(36,76,184,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:brightness-100"
                >
                  <span className="auth-btn-gloss__content flex items-center gap-2">
                    Bắt đầu đăng ký
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* ── MÀN HÌNH 2: Form điền thông tin ── */
            <>
          {submitError ? (
        <div className="auth-reveal is-visible flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/95 p-4 shadow-[0_12px_24px_rgba(239,68,68,0.16)]">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm font-medium text-red-800">{submitError}</p>
        </div>
      ) : null}

      {status === "unregistered" ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
          className="auth-reveal is-visible mt-2 rounded-[24px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_75%,#deebff_100%)] px-5 pb-6 pt-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-sm sm:mt-3 sm:px-6 sm:pt-6"
        >
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-6 xl:col-span-2">
                <div className="rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)] transition-all duration-300 ease-out hover:border-[#aac3ea] hover:shadow-[0_22px_44px_rgba(36,76,184,0.14)] sm:p-7">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#2d58c4] bg-[radial-gradient(circle_at_30%_30%,#2347a8_0%,#1b3e97_58%,#17347e_100%)] text-[#b7ccff] shadow-[inset_0_1px_0_rgba(132,166,244,0.30),0_12px_24px_rgba(36,76,184,0.18)]">
                      <UserCircle2 className="h-5 w-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">Bước 1</span>
                      </div>
                      <h2 className="text-lg font-semibold text-[#1F3152]">Thông tin cá nhân</h2>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {studentInfoFields.map(renderFormField)}
                  </div>

                  <div className="mt-8 border-t border-[#d9e6f7] pt-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#5578AC]">Giấy tờ và liên hệ</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {identityFields.map(renderFormField)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-2 rounded-[22px] border border-[#c9d8ef] bg-[linear-gradient(180deg,#eef5ff_0%,#e7f0ff_42%,#edf4fd_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] transition-all duration-300 hover:border-[#9fbde9] hover:shadow-[0_16px_30px_rgba(36,76,184,0.10)] sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold uppercase tracking-wide text-[#5578AC]">Hồ sơ ảnh đính kèm</h3>
                    <p className="mt-1 text-sm text-[#5C7094]">Ảnh thẻ và ảnh CCCD vẫn được giữ nguyên để backend nhận hồ sơ như hiện tại.</p>
                  </div>
                  <span className="w-fit rounded-full bg-[linear-gradient(135deg,#244CB8_0%,#4F7FF1_100%)] px-3 py-1 text-xs font-semibold text-white shadow-[0_8px_16px_rgba(36,76,184,0.22)]">
                    JPG, PNG, WEBP
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:[grid-template-columns:repeat(3,minmax(0,15rem))] lg:justify-between lg:gap-8">
                  {documentFieldConfigs.map(({ field }) => (
                    <motion.div key={field} transition={{ duration: 0.2 }}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => openDocumentPicker(field)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openDocumentPicker(field);
                          }
                        }}
                        onDragOver={(e) => handleDocumentDragOver(field, e)}
                        onDragEnter={(e) => handleDocumentDragOver(field, e)}
                        onDragLeave={(e) => handleDocumentDragLeave(field, e)}
                        onDrop={(e) => handleDocumentDrop(field, e)}
                        className={`group h-full rounded-3xl border-2 border-dashed p-3 transition-all duration-300 ease-out ${documentErrors[field]
                          ? "border-red-500/70 bg-red-950/30 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.55)]"
                          : draggingDocumentField === field
                            ? "border-[#244CB8] bg-white shadow-[0_24px_46px_rgba(36,76,184,0.16),inset_0_0_0_1px_rgba(36,76,184,0.16)]"
                            : documentFiles[field]
                              ? "border-[#B8CDEA] bg-white shadow-[inset_0_0_0_1px_rgba(143,170,226,0.24)] hover:border-[#244CB8] hover:shadow-[0_18px_36px_rgba(36,76,184,0.14),inset_0_0_0_1px_rgba(36,76,184,0.14)]"
                              : "border-[#bfd2ec] bg-[linear-gradient(180deg,#f5f9ff_0%,#edf4ff_100%)] shadow-[inset_0_0_0_1px_rgba(185,205,234,0.24)] hover:border-[#8fb3e5] hover:bg-white hover:shadow-[0_18px_34px_rgba(36,76,184,0.12),inset_0_0_0_1px_rgba(185,205,234,0.24)]"
                        }`}
                      >
                        <input
                          type="file"
                          name={field}
                          accept="image/*"
                          onChange={handleDocumentChange}
                          ref={(node) => {
                            documentRefs.current[field] = node;
                          }}
                          className="sr-only"
                        />

                        {(documentFiles[field] || blurStatus[field] === 'analyzing') && (
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-[#204178]">
                                {documentLabels[field]} <span className="text-red-500">*</span>
                              </p>
                            </div>
                            <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
                              blurStatus[field] === 'ok'
                                ? 'bg-emerald-50 text-emerald-600'
                                : blurStatus[field] === 'warn'
                                ? 'bg-amber-50 text-amber-500'
                                : blurStatus[field] === 'analyzing'
                                ? 'bg-[#eef4ff] text-[#244CB8]'
                                : 'bg-[linear-gradient(180deg,#eef4ff_0%,#e2ecff_100%)] text-[#244CB8] group-hover:bg-[#dce7ff] group-hover:shadow-[0_10px_22px_rgba(36,76,184,0.18)]'
                            }`}>
                              {blurStatus[field] === 'analyzing'
                                ? <LoaderCircle className="h-5 w-5 animate-spin" />
                                : blurStatus[field] === 'warn'
                                ? <AlertCircle className="h-5 w-5" />
                                : <CheckCircle className="h-5 w-5" />
                              }
                            </div>
                          </div>
                        )}

                        {blurStatus[field] === 'analyzing' ? (
                          <div className="mt-4 flex min-h-[120px] flex-col items-center justify-center gap-2">
                            <LoaderCircle className="h-6 w-6 animate-spin text-[#244CB8]" />
                            <p className="text-xs font-medium text-[#5C7094]">Đang phân tích ảnh...</p>
                          </div>
                        ) : documentFiles[field] ? (
                          <div className="mt-4 space-y-4">
                            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#eef4ff_0%,#e5efff_100%)]">
                              <img
                                src={documentPreviewUrls[field]}
                                alt={documentLabels[field]}
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                  console.error(`[Image Error] Failed to load ${field}:`, documentPreviewUrls[field]);
                                  const image = event.currentTarget;
                                  const fallbackMap: Record<DocumentField, string> = {
                                    portraitPhoto: createPreviewSvg("Ảnh thẻ", "Ảnh hồ sơ", "#2f63da"),
                                    cccdFrontPhoto: createPreviewSvg("CCCD mặt trước", "Ảnh hồ sơ", "#2f63da"),
                                    cccdBackPhoto: createPreviewSvg("CCCD mặt sau", "Ảnh hồ sơ", "#31b7d4"),
                                  };
                                  if (image.src !== fallbackMap[field]) {
                                    image.src = fallbackMap[field];
                                  }
                                }}
                                onLoad={() => console.log(`[Image Load] Successfully loaded ${field}:`, documentPreviewUrls[field])}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#cfdbef] bg-[linear-gradient(180deg,#f7fbff_0%,#eef5ff_100%)] px-4 py-3 shadow-[0_10px_20px_rgba(36,76,184,0.08)]">
                              <div className="group relative min-w-0">
                                <p
                                  title={documentFiles[field]?.name}
                                  className="truncate text-sm font-semibold text-[#2B4779]"
                                >
                                  {documentFiles[field]?.name}
                                </p>
                                <div className="pointer-events-none absolute -top-11 left-0 z-10 max-w-[260px] translate-y-1 rounded-xl bg-[#163a79] px-3 py-2 text-xs font-medium text-white opacity-0 shadow-[0_14px_28px_rgba(17,40,97,0.28)] transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                                  <span className="block break-words">{documentFiles[field]?.name}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDocumentPicker(field);
                                }}
                                className="flex-shrink-0 rounded-xl bg-[linear-gradient(135deg,#244CB8_0%,#4F7FF1_100%)] px-3 py-2 text-xs font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_14px_24px_rgba(36,76,184,0.28)]"
                              >
                                Chọn lại
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 flex min-h-[180px] flex-col items-center justify-center px-3 py-4 text-center">
                            <div className="flex items-center justify-center text-[#244CB8] drop-shadow-[0_8px_18px_rgba(36,76,184,0.14)] transition-all duration-300 group-hover:scale-105 group-hover:text-[#173D97]">
                              <ImagePlus className="h-7 w-7" />
                            </div>
                            <p className="mt-5 text-sm font-semibold text-[#204178]">
                              {documentLabels[field]} <span className="text-red-500">*</span>
                            </p>
                            <p className="mt-2 text-sm leading-7 text-[#6F89B5]">
                              {draggingDocumentField === field ? "Thả ảnh vào đây" : documentUploadHints[field]}
                            </p>
                          </div>
                        )}
                      </div>
                      {documentErrors[field] && <ErrorMessage message={documentErrors[field] as string} />}
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)] transition-all duration-300 ease-out hover:border-[#aac3ea] hover:shadow-[0_22px_44px_rgba(36,76,184,0.14)] sm:p-7">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#315ec7] bg-[radial-gradient(circle_at_30%_30%,#2558c7_0%,#214cb3_55%,#193d8f_100%)] text-[#9fd4ff] shadow-[inset_0_1px_0_rgba(120,169,255,0.26),0_12px_24px_rgba(36,76,184,0.18)]">
                    <Users className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">Bước 2</span>
                    </div>
                    <h2 className="text-lg font-semibold text-[#1F3152]">Thông tin người thân</h2>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {familyFields.map(renderFormField)}
                </div>
              </div>

              <div className="rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)] transition-all duration-300 ease-out hover:border-[#aac3ea] hover:shadow-[0_22px_44px_rgba(36,76,184,0.14)] sm:p-7">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#3a67cf] bg-[radial-gradient(circle_at_30%_30%,#2b63da_0%,#244cb8_58%,#1c3f99_100%)] text-[#9ee5ff] shadow-[inset_0_1px_0_rgba(136,181,255,0.28),0_12px_24px_rgba(36,76,184,0.20)]">
                    <Clock className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">Bước 3</span>
                    </div>
                    <h2 className="text-lg font-semibold text-[#1F3152]">Thông tin lưu trú</h2>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center gap-2.5 rounded-xl border border-[#cfdcf0] bg-[#f7faff] px-4 py-3">
                    <Clock className="h-4 w-4 shrink-0 text-[#244CB8]" />
                    <span className="text-sm text-[#324B76]">
                      {stayInfo?.stay_start_date && stayInfo.stay_end_date
                        ? <>Thời gian lưu trú: <span className="font-semibold">{formatDate(stayInfo.stay_start_date)}</span> — <span className="font-semibold">{formatDate(stayInfo.stay_end_date)}</span></>
                        : "Thời gian lưu trú sẽ được thông báo sau"}
                    </span>
                  </div>
                </div>
              </div>

              {priorityCriteriaList.length > 0 && (
                <div className="rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)] transition-all duration-300 ease-out hover:border-[#aac3ea] hover:shadow-[0_22px_44px_rgba(36,76,184,0.14)] sm:p-7 xl:col-span-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#2d58c4] bg-[radial-gradient(circle_at_30%_30%,#2347a8_0%,#1b3e97_58%,#17347e_100%)] text-[#b7ccff] shadow-[inset_0_1px_0_rgba(132,166,244,0.30),0_12px_24px_rgba(36,76,184,0.18)]">
                      <Star className="h-5 w-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">Bước 4</span>
                      <h2 className="text-lg font-semibold text-[#1F3152]">Tiêu chí ưu tiên</h2>
                      <p className="mt-0.5 text-sm text-[#5C7094]">Chọn các tiêu chí phù hợp (không bắt buộc)</p>
                      <p className="mt-1 text-xs text-emerald-600">Một số diện ưu tiên đã được xác minh sẽ được tự động áp dụng chính sách miễn/giảm phí phòng ở nếu có.</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    {priorityCriteriaList.map((criteria) => {
                      const isChecked = selectedCriteriaIds.includes(criteria.id);
                      const files = evidenceFiles[criteria.id] ?? [];
                      const evidenceError = evidenceErrors[criteria.id];
                      const canAddMore = files.length < MAX_EVIDENCE_FILES;
                      return (
                        <div
                          key={criteria.id}
                          ref={(node) => { criteriaRefs.current[criteria.id] = node; }}
                          className={`rounded-xl border bg-[#f7fbff] p-3 transition hover:border-[#a8c5ea] hover:bg-white ${
                            evidenceError ? "border-red-300" : "border-[#dce9f7]"
                          }`}
                        >
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCriteriaIds((prev) => [...prev, criteria.id]);
                                } else {
                                  setSelectedCriteriaIds((prev) => prev.filter((id) => id !== criteria.id));
                                  setEvidenceFiles((prev) => {
                                    const next = { ...prev };
                                    delete next[criteria.id];
                                    return next;
                                  });
                                  setEvidenceErrors((prev) => {
                                    const next = { ...prev };
                                    delete next[criteria.id];
                                    return next;
                                  });
                                  if (evidenceRefs.current[criteria.id]) {
                                    evidenceRefs.current[criteria.id]!.value = "";
                                  }
                                }
                              }}
                              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#244CB8]"
                            />
                            <div>
                              <p className="text-sm font-semibold text-[#1F3152]">
                                [{criteria.code}] {criteria.name}
                              </p>
                              {criteria.description ? (
                                <p className="mt-0.5 text-xs text-[#5C7094]">{criteria.description}</p>
                              ) : null}
                            </div>
                          </label>

                          {isChecked && (
                            <div className="mt-3 ml-7">
                              <input
                                type="file"
                                id={`evidence-${criteria.id}`}
                                ref={(node) => { evidenceRefs.current[criteria.id] = node; }}
                                accept=".jpg,.jpeg,.png,.pdf"
                                multiple
                                className="sr-only"
                                onChange={(e) => {
                                  const picked = Array.from(e.target.files ?? []);
                                  e.target.value = "";
                                  if (picked.length === 0) return;

                                  const oversize = picked.find((f) => f.size > 5 * 1024 * 1024);
                                  if (oversize) {
                                    setEvidenceErrors((prev) => ({ ...prev, [criteria.id]: "Mỗi ảnh tối đa 5MB" }));
                                    return;
                                  }

                                  setEvidenceFiles((prev) => {
                                    const current = prev[criteria.id] ?? [];
                                    const merged = [...current, ...picked].slice(0, MAX_EVIDENCE_FILES);
                                    const exceeded = current.length + picked.length > MAX_EVIDENCE_FILES;
                                    setEvidenceErrors((errs) => {
                                      const next = { ...errs };
                                      if (exceeded) next[criteria.id] = `Tối đa ${MAX_EVIDENCE_FILES} ảnh`;
                                      else delete next[criteria.id];
                                      return next;
                                    });
                                    return { ...prev, [criteria.id]: merged };
                                  });
                                }}
                              />

                              {files.length > 0 && (
                                <div className="mb-2 space-y-1.5">
                                  {files.map((file, idx) => (
                                    <div
                                      key={`${file.name}-${idx}`}
                                      className="flex items-center justify-between gap-2 rounded-lg border border-[#dce9f7] bg-white px-3 py-1.5"
                                    >
                                      <span className="flex items-center gap-1.5 truncate text-xs text-[#4a6fa5]">
                                        <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span className="truncate">{file.name}</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEvidenceFiles((prev) => {
                                            const nextArr = (prev[criteria.id] ?? []).filter((_, i) => i !== idx);
                                            const next = { ...prev };
                                            if (nextArr.length > 0) next[criteria.id] = nextArr;
                                            else delete next[criteria.id];
                                            return next;
                                          });
                                          setEvidenceErrors((prev) => {
                                            const next = { ...prev };
                                            delete next[criteria.id];
                                            return next;
                                          });
                                        }}
                                        className="inline-flex flex-shrink-0 items-center gap-1 text-xs text-red-500 hover:underline"
                                      >
                                        <X className="h-3 w-3" /> Xóa
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {canAddMore && (
                                <label
                                  htmlFor={`evidence-${criteria.id}`}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[#b5cef0] bg-white px-3 py-1.5 text-xs text-[#4a6fa5] transition hover:border-[#244CB8] hover:text-[#244CB8]"
                                >
                                  <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                                  {files.length > 0
                                    ? `Thêm ảnh (${files.length}/${MAX_EVIDENCE_FILES})`
                                    : `Tải lên minh chứng (JPG, PNG, PDF — tối đa 5MB, ${MAX_EVIDENCE_FILES} ảnh)`}
                                </label>
                              )}
                              {!canAddMore && (
                                <p className="text-xs text-[#5C7094]">Đã đạt tối đa {MAX_EVIDENCE_FILES} ảnh</p>
                              )}
                              {evidenceError && (
                                <p className="mt-1 text-xs text-red-500">{evidenceError}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)] transition-all duration-300 ease-out hover:border-[#aac3ea] hover:shadow-[0_22px_44px_rgba(36,76,184,0.14)] sm:p-7 xl:col-span-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#3a67cf] bg-[radial-gradient(circle_at_30%_30%,#2b63da_0%,#244cb8_58%,#1c3f99_100%)] text-[#9ee5ff] shadow-[inset_0_1px_0_rgba(136,181,255,0.28),0_12px_24px_rgba(36,76,184,0.20)]">
                    <CheckCircle className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#1F3152]">Cam kết của sinh viên</h2>
                    <p className="mt-1 text-sm text-[#5C7094]">
                      Phải đảm bảo tuân thủ các quy định và nội quy của ký túc xá
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-5 text-sm leading-7 text-[#324B76]">
                  {commitmentSections.map((section) => (
                    <div key={section.title} className="rounded-[22px] border border-[#d8e5f6] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                      <h3 className="text-base font-semibold text-[#1F3152]">{section.title}</h3>
                      <ol className="mt-4 space-y-2 pl-5 list-decimal">
                        {section.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>

              <>
                  <div className="xl:col-span-2 rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)] transition-all duration-300 ease-out hover:border-[#aac3ea] hover:shadow-[0_22px_44px_rgba(36,76,184,0.14)] sm:p-7">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        id="commitmentConfirm"
                        checked={commitmentConfirmed}
                        onChange={(e) => {
                          setCommitmentConfirmed(e.target.checked);
                          setSubmitError("");
                        }}
                        className="mt-1 h-5 w-5 flex-shrink-0 cursor-pointer rounded-lg border-2 border-[#b7ccee] bg-white text-[#244CB8] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-all duration-200 checked:border-[#244CB8] checked:bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] checked:shadow-[0_10px_18px_rgba(36,76,184,0.20)] hover:border-[#244CB8] hover:shadow-[0_8px_16px_rgba(36,76,184,0.14)] focus:outline-none focus:ring-4 focus:ring-[#244CB8]/14 accent-[#244CB8]"/>
                      <label htmlFor="commitmentConfirm" className="flex-1 cursor-pointer">
                        <p className="text-sm leading-6 text-[#324B76]">
                          Tôi cam kết thực hiện đúng nội quy, quy định của Nhà trường và chịu trách nhiệm về các thông tin đã kê khai. Nếu vi phạm, tôi xin chịu hoàn toàn trách nhiệm trước Nhà trường và pháp luật.
                        </p>
                      </label>
                    </div>
                    {!commitmentConfirmed && submitError && submitError.includes("cam kết") && (
                      <ErrorMessage message={submitError} />
                    )}
                  </div>

                  <div className="xl:col-span-2 flex items-center justify-between gap-3 border-t border-[#DFE8F4] pt-4">
                    <button
                      type="button"
                      onClick={() => setStep('info')}
                      className="auth-btn-gloss inline-flex items-center gap-2 rounded-2xl border border-[#c5d4f0] bg-[linear-gradient(135deg,#ffffff_0%,#f1f6ff_48%,#e8f0ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#244CB8] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_22px_rgba(36,76,184,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a9c0ea] hover:bg-[linear-gradient(135deg,#ffffff_0%,#edf4ff_40%,#dfeaff_100%)] hover:text-[#173D97] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_16px_28px_rgba(36,76,184,0.16)] active:scale-[0.98]"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span className="auth-btn-gloss__content">Quay lại</span>
                    </button>
                    <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleClearForm}
                      className="auth-btn-gloss rounded-2xl border border-[#c5d4f0] bg-[linear-gradient(135deg,#ffffff_0%,#f1f6ff_48%,#e8f0ff_100%)] px-6 py-2.5 text-sm font-semibold text-[#244CB8] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_22px_rgba(36,76,184,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a9c0ea] hover:bg-[linear-gradient(135deg,#ffffff_0%,#edf4ff_40%,#dfeaff_100%)] hover:text-[#173D97] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_16px_28px_rgba(36,76,184,0.16)] active:scale-[0.98]"
                    >
                      <span className="auth-btn-gloss__content">Xóa</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_22px_40px_rgba(36,76,184,0.34)] active:scale-[0.98]"
                    >
                      <span className="auth-btn-gloss__content">{isSubmitting ? "Đang gửi..." : "Gửi đăng ký"}</span>
                    </button>
                    </div>
                  </div>
                </>
            </div>
          </form>
        </motion.div>
      ) : null}
            </>
          )}
        </>
      )}

      {blurWarnField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              <p className="font-semibold text-amber-900">Ảnh có thể hơi mờ</p>
            </div>
            <p className="mt-2 text-sm text-[#5C7094]">
              Ảnh bạn vừa chọn có thể khó nhận dạng. Bạn có chắc muốn dùng ảnh này không?
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (pendingBlurFile) {
                    setDocumentFiles((prev) => ({ ...prev, [pendingBlurFile.field]: pendingBlurFile.file }));
                  }
                  setBlurWarnField(null);
                  setPendingBlurFile(null);
                }}
                className="flex-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                Dùng ảnh này
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingBlurFile) {
                    setBlurStatus((prev) => ({ ...prev, [pendingBlurFile.field]: null }));
                    if (documentRefs.current[pendingBlurFile.field])
                      documentRefs.current[pendingBlurFile.field]!.value = '';
                  }
                  setBlurWarnField(null);
                  setPendingBlurFile(null);
                }}
                className="flex-1 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Chọn ảnh khác
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
}
