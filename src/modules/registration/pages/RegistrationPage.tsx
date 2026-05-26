import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BedSingle,
  CheckCircle,
  Clock,
  Home,
  ImagePlus,
  LoaderCircle,
  ShieldCheck,
  UserCircle2,
  Users,
} from "lucide-react";
import {
  getLatestRegistrationByEmail,
  submitRegistration,
} from "../../../api/registrationService";
import { checkStudentCodeExists } from "../../auth/services/auth.api";
import { useAuthStore } from "../../auth/store";
import type { RegistrationRequest } from "../../admin/data/registrationRequests";
import ProgressStep from "../components/ProgressStep";

type RegistrationStatus = "unregistered" | "pending" | "approved" | "rejected" | "completed";
type ProgressStatus = "pending" | "approved" | "assigned_room" | "selected_bed" | "completed";
type DocumentField = "portraitPhoto" | "cccdFrontPhoto" | "cccdBackPhoto";
type RegistrationWithAssignment = RegistrationRequest & {
  assigned_room_id?: number | null;
  building_code?: string;
  room_number?: number;

};

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
}

function getCurrentStep(status: string): number {
  switch (status) {
    case "pending":
      return 1;
    case "approved":
      return 2;
    case "assigned_room":
      return 3;
    case "selected_bed":
      return 4;
    case "completed":
      return 5;
    default:
      return 1;
  }
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
  father_name: "",
  father_phone: "",
  father_job: "",
  mother_name: "",
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

const dateFieldNames: Array<keyof FormData> = ["birthDate", "cccdIssueDate", "dormStartDate", "dormEndDate"];

const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;

const formFieldLabels: Record<keyof FormData, string> = {
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
  father_name: "họ tên cha",
  father_phone: "SĐT cha",
  father_job: "nghề nghiệp cha",
  mother_name: "họ tên mẹ",
  mother_phone: "SĐT mẹ",
  mother_job: "nghề nghiệp mẹ",
  familyContactAddress: "địa chỉ liên hệ cha/mẹ",
  relationName: "người liên hệ khẩn cấp",
  relationPhone: "SĐT người liên hệ",
  relationship: "quan hệ",
  dormStartDate: "từ ngày",
  dormEndDate: "đến ngày",
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

export default function RegistrationPage() {
  const navigate = useNavigate();
  const studentEmail = useAuthStore((state) => state.user?.email ?? "");
  const [registration, setRegistration] = useState<RegistrationWithAssignment | null>(null);
  const [status, setStatus] = useState<RegistrationStatus>("unregistered");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [documentFiles, setDocumentFiles] = useState<Record<DocumentField, File | null>>(initialDocumentFiles);
  const [draggingDocumentField, setDraggingDocumentField] = useState<DocumentField | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [documentErrors, setDocumentErrors] = useState<Partial<Record<DocumentField, string>>>({});
  const [isReviewingSubmittedForm, setIsReviewingSubmittedForm] = useState(false);
  const [reviewDocumentUrls, setReviewDocumentUrls] = useState<Record<DocumentField, string>>(initialDocumentPreviewUrls);
  const [commitmentConfirmed, setCommitmentConfirmed] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const fieldRefs = useRef<
    Partial<Record<keyof FormData, HTMLInputElement | HTMLSelectElement | null>>
  >({});
  const documentRefs = useRef<Partial<Record<DocumentField, HTMLInputElement | null>>>({});

  const documentPreviewUrls = useMemo(() => {
    const nextPreviewUrls = { ...initialDocumentPreviewUrls };

    documentFieldConfigs.forEach(({ field }) => {
      const file = documentFiles[field];
      if (!file) {
        // Hiển thị preview tài liệu đã tải lên nếu có
        // bất kể đang ở chế độ duyệt nghiêm ngặt hay đang gửi lại.
        if (reviewDocumentUrls[field]) {
          nextPreviewUrls[field] = reviewDocumentUrls[field];
        }

        return;
      }

      nextPreviewUrls[field] = URL.createObjectURL(file);
    });

    return nextPreviewUrls;
  }, [documentFiles, reviewDocumentUrls]);

  

  const getRegistration = async (): Promise<RegistrationWithAssignment | null> => {
    if (!studentEmail) {
      return null;
    }

    return (await getLatestRegistrationByEmail(studentEmail)) as RegistrationWithAssignment | null;
  };

  // Đã bỏ openReview: việc xem lại form đã nộp giờ phải được kích hoạt rõ ràng qua luồng nộp lại.

  const openResubmit = async () => {
    // Xóa mọi dữ liệu trước đó và hiển thị một form trống có thể chỉnh sửa để nộp lại.
    resetFormState();
    setRegistration(null);
    setStatus("unregistered");
    setRejectionReason("");
    setReviewDocumentUrls(initialDocumentPreviewUrls);
    setIsReviewingSubmittedForm(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const scrollContainer =
          formRef.current?.closest(".auth-scrollbar") ?? document.querySelector(".auth-scrollbar");
        if (scrollContainer instanceof HTMLElement) {
          scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  };
useEffect(() => {
  const syncRegistrationState = async () => {
    setFormData({ ...initialFormData });
    setDocumentFiles({ ...initialDocumentFiles });
    setErrors({});
    setDocumentErrors({});
    setRegistration(null);
    setStatus("unregistered");
    setRejectionReason("");
    setSubmitError("");
    setIsReviewingSubmittedForm(false);
    setReviewDocumentUrls(initialDocumentPreviewUrls);

    documentFieldConfigs.forEach(({ field }) => {
      if (documentRefs.current[field]) {
        documentRefs.current[field]!.value = "";
      }
    });

    if (!studentEmail) {
      return;
    }

    setIsCheckingRegistration(true);

    try {
      const data = await getLatestRegistrationByEmail(studentEmail);

      if (!data) {
        setRegistration(null);
        setStatus("unregistered");
        setRejectionReason("");
        setReviewDocumentUrls(initialDocumentPreviewUrls);
        setIsReviewingSubmittedForm(false);
        return;
      }

      setRegistration(data);
      setStatus(data.status);
      setRejectionReason(data.rejectionReason ?? "");
      setFormData({ ...initialFormData, ...data.formData });
      setDocumentFiles({ ...initialDocumentFiles });
      const buildStorageUrl = (path?: string) => {
        if (!path) return "";

        if (path.startsWith("http")) {
          return path;
        }

        return `${import.meta.env.VITE_API_BASE_URL}/storage/${path}`;
      };

setReviewDocumentUrls({
  portraitPhoto: buildStorageUrl(data.documents?.portraitPhoto),
  cccdFrontPhoto: buildStorageUrl(data.documents?.cccdFrontPhoto),
  cccdBackPhoto: buildStorageUrl(data.documents?.cccdBackPhoto),
});
      setIsReviewingSubmittedForm(false);
    } finally {
      setIsCheckingRegistration(false);
    }
  };

  void syncRegistrationState();
}, [studentEmail]);

  async function reloadRegistration() {
    setIsCheckingRegistration(true);

    try {
      const data = await getRegistration();

      if (!data) {
        setRegistration(null);
        setStatus("unregistered");
        setRejectionReason("");
        setReviewDocumentUrls(initialDocumentPreviewUrls);
        setIsReviewingSubmittedForm(false);
        return null;
      }

      setRegistration(data);
      setStatus(data.status);
      setRejectionReason(data.rejectionReason ?? "");
      // Điền sẵn formData để cả luồng xem lại và nộp lại đều dùng được.
      setFormData({ ...initialFormData, ...data.formData });
      // Giữ documentFiles trống (không có File object). Lưu
      // các URL preview để UI có thể hiển thị ảnh xem trước cho luồng xem lại hoặc nộp lại.
      setDocumentFiles({ ...initialDocumentFiles });
      setReviewDocumentUrls(data.documents ?? initialDocumentPreviewUrls);
      // Không tự động vào trạng thái xem lại chỉ đọc ở đây - nơi gọi
      // nên tự quyết định mở xem lại (chỉ đọc) hay nộp lại (có thể chỉnh sửa).
      setIsReviewingSubmittedForm(false);
      return data;
    } finally {
      setIsCheckingRegistration(false);
    }
  }

  const registrationForView = registration;

  const statusForView = registrationForView?.status ?? status;

  const assignedRoomName = null;
  const selectedBedName = null;
  const hasSelectedBed = false;



  
  const progressStatus: ProgressStatus = useMemo(() => {
    if (statusForView === "completed") {
      return "completed";
    }

    if (registrationForView?.bedId) {
      return "selected_bed";
    }

    if (statusForView === "approved" && registrationForView?.assigned_room_id && assignedRoomName) {
      return "assigned_room";
    }

    if (statusForView === "approved") {
      return "approved";
    }

    return "pending";
  }, [assignedRoomName, registrationForView?.assigned_room_id, registrationForView?.bedId, statusForView]);

  const currentProgressStep = useMemo(() => getCurrentStep(progressStatus), [progressStatus]);

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

  const toDataUrl = async (file: File) => {
    // Giữ nguyên các tệp nhỏ để tránh giảm chất lượng không cần thiết.
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
    if (!nextFile.type.startsWith("image/")) {
      setDocumentErrors((prev) => ({
        ...prev,
        [fieldName]: "Vui lòng chọn tệp ảnh hợp lệ",
      }));
      return;
    }

    setDocumentFiles((prev) => ({
      ...prev,
      [fieldName]: nextFile,
    }));

    setDocumentErrors((prev) => {
      if (!prev[fieldName]) {
        return prev;
      }

      const nextErrors = { ...prev };
      delete nextErrors[fieldName];
      return nextErrors;
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

  const [isCheckingMssv, setIsCheckingMssv] = useState(false);

  const handleMssvBlur = async () => {
    const code = formData.mssv?.trim();
    if (!code) return;

    setIsCheckingMssv(true);
    try {
      const res = await checkStudentCodeExists(code);
      const exists = res?.exists ?? false;

      if (!exists) {
        setErrors((prev) => ({ ...prev, mssv: "MSSV sai. Vui lòng nhập MSSV đã đăng ký." }));
      } else {
        setErrors((prev) => {
          if (!prev.mssv) return prev;
          const copy = { ...prev };
          delete copy.mssv;
          return copy;
        });
      }
    } catch (err) {
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
      if (input) {
        input.value = "";
      }
    });
    setDraggingDocumentField(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    const requiredFields = Object.keys(formFieldLabels) as Array<keyof FormData>;
    const nextErrors: Partial<Record<keyof FormData, string>> = {};
    const nextDocumentErrors: Partial<Record<DocumentField, string>> = {};
    let commitmentError = "";

    for (const field of requiredFields) {
      if (!formData[field].trim()) {
        nextErrors[field] = `Vui lòng điền ${formFieldLabels[field]}`;
        continue;
      }

      if (dateFieldNames.includes(field) && !dateRegex.test(formData[field].trim())) {
        nextErrors[field] = `Ngày tháng phải theo định dạng dd/mm/yyyy.`;
      }
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!phoneRegex.test(formData.phone.trim())) {
      nextErrors.phone = "Số điện thoại phải gồm đúng 10 chữ số.";
    }

    if (!formData.father_phone.trim()) {
      nextErrors.father_phone = "Vui lòng nhập số điện thoại cha.";
    } else if (!phoneRegex.test(formData.father_phone.trim())) {
      nextErrors.father_phone = "Số điện thoại cha phải gồm đúng 10 chữ số.";
    }

    if (!formData.mother_phone.trim()) {
      nextErrors.mother_phone = "Vui lòng nhập số điện thoại mẹ.";
    } else if (!phoneRegex.test(formData.mother_phone.trim())) {
      nextErrors.mother_phone = "Số điện thoại mẹ phải gồm đúng 10 chữ số.";
    }

    if (!formData.relationPhone.trim()) {
      nextErrors.relationPhone = "Vui lòng nhập SĐT người liên hệ.";
    } else if (!phoneRegex.test(formData.relationPhone.trim())) {
      nextErrors.relationPhone = "Số điện thoại liên hệ phải gồm đúng 10 chữ số.";
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

    if (Object.keys(nextErrors).length > 0 || Object.keys(nextDocumentErrors).length > 0 || commitmentError) {
      setErrors(nextErrors);
      setDocumentErrors(nextDocumentErrors);

      if (commitmentError) {
        setSubmitError(commitmentError);
      }

      const firstInvalidField = requiredFields.find((field) => nextErrors[field]);
      if (firstInvalidField) {
        fieldRefs.current[firstInvalidField]?.focus();
        fieldRefs.current[firstInvalidField]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return;
      }

      const firstInvalidDocument = documentFieldConfigs.find(({ field }) => nextDocumentErrors[field]);
      if (firstInvalidDocument) {
        documentRefs.current[firstInvalidDocument.field]?.focus();
        documentRefs.current[firstInvalidDocument.field]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }

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
      await Promise.all([
        toDataUrl(documentFiles.portraitPhoto as File),
        toDataUrl(documentFiles.cccdFrontPhoto as File),
        toDataUrl(documentFiles.cccdBackPhoto as File),
      ]);

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

      form.append("parent_name", formData.relationName);
      form.append("parent_phone", formData.relationPhone);
      form.append("parent_relationship", formData.relationship);

      // Thông tin cha / gia đình
      form.append("father_name", formData.father_name);
      form.append("father_phone", formData.father_phone);
      form.append("father_job", formData.father_job);
      form.append("mother_name", formData.mother_name);
      form.append("mother_phone", formData.mother_phone);
      form.append("mother_job", formData.mother_job);
      form.append("parent_address", formData.familyContactAddress || formData.address || "");

      // Ngày lưu trú
      form.append("stay_from_date", formData.dormStartDate || "");
      form.append("stay_to_date", formData.dormEndDate || "");

      form.append("commitment_confirmed", commitmentConfirmed ? "true" : "false");
      form.append("commitment_confirm", commitmentConfirmed ? "1" : "0");

      form.append("avatar", documentFiles.portraitPhoto as File);
      form.append("cccd_front", documentFiles.cccdFrontPhoto as File);
      form.append("cccd_back", documentFiles.cccdBackPhoto as File);

      const res = await submitRegistration(form);

      const data = res;

      if (!data) {
        setSubmitError("Không thể gửi đơn. Vui lòng thử lại.");
        return;
      }

      setRegistration(data);
      setStatus(data.status);
      setIsReviewingSubmittedForm(false);
    } catch (error) {
      if (error && typeof error === "object" && "response" in error) {
        const response = (error as { response?: { data?: Record<string, unknown> } }).response;
        const responseData = response?.data;

        if (responseData) {
          const message = responseData.message;
          if (typeof message === "string") {
            setSubmitError(message);
            return;
          }

          const validationMessages = responseData.errors
            ? Object.values(responseData.errors as Record<string, unknown>).flat().filter(Boolean)
            : [];

          if (validationMessages.length > 0) {
            setSubmitError(String(validationMessages[0]));
            return;
          }
        }
      }

      setSubmitError(error instanceof Error ? error.message : "Không thể gửi đơn. Vui lòng thử lại.");
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

  const getFieldClassName = () =>
    "mt-1 h-11 w-full rounded-xl border border-[#D6E2F1] bg-[#F6F9FD] px-4 text-sm text-[#1F3152] placeholder:text-[#90A2BF] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-all duration-300 ease-out hover:border-[#B9CDEE] hover:bg-white hover:shadow-[0_14px_28px_rgba(36,76,184,0.10)] focus:border-[#244CB8] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#244CB8]/14";

  const getStep2FieldClassName = () =>
    "mt-1 h-11 w-full rounded-xl border border-[#D6E2F1] bg-[#F6F9FD] px-4 text-sm text-[#1F3152] placeholder:text-[#90A2BF] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-all duration-300 ease-out hover:border-[#B9CDEE] hover:bg-white hover:shadow-[0_14px_28px_rgba(36,76,184,0.10)] focus:border-[#244CB8] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#244CB8]/14";

  const renderFormField = (config: FormFieldConfig) => {
    const isRequired = true;
    const fieldValue = formData[config.name];
    const isDateField = dateFieldNames.includes(config.name);
    const className = config.type === "select" ? getStep2FieldClassName() : getFieldClassName();
    const fieldId = `registration-${String(config.name)}`;

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
          >
            <option value="">{config.placeholder ?? `Chọn ${config.label.toLowerCase()}`}</option>
            {config.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
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
          />
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
  ];

  const familyFields: FormFieldConfig[] = [
    { name: "father_name", label: "Họ tên cha", placeholder: "Nhập họ tên cha", required: true },
    { name: "father_phone", label: "SĐT cha", type: "tel", placeholder: "Số điện thoại cha", required: true },
    { name: "father_job", label: "Nghề nghiệp cha", placeholder: "Nhập nghề nghiệp cha", required: true },
    { name: "mother_name", label: "Họ tên mẹ", placeholder: "Nhập họ tên mẹ", required: true },
    { name: "mother_phone", label: "SĐT mẹ", type: "tel", placeholder: "Số điện thoại mẹ", required: true },
    { name: "mother_job", label: "Nghề nghiệp mẹ", placeholder: "Nhập nghề nghiệp mẹ", required: true },
    { name: "familyContactAddress", label: "Địa chỉ liên hệ cha/mẹ", placeholder: "Nhập địa chỉ liên hệ", fullWidth: true, required: true },
    { name: "relationName", label: "Người liên hệ khẩn cấp", placeholder: "Nhập tên người liên hệ", required: true },
    { name: "relationPhone", label: "SĐT người liên hệ", type: "tel", placeholder: "Nhập số điện thoại", required: true },
    { name: "relationship", label: "Quan hệ", type: "select", placeholder: "Chọn quan hệ", options: relationshipOptions, required: true },
  ];

  const accommodationFields: FormFieldConfig[] = [
    { name: "dormStartDate", label: "Từ ngày", required: true },
    { name: "dormEndDate", label: "Đến ngày", required: true },
  ];

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

      <ProgressStep currentStep={currentProgressStep} />

      {statusForView === "pending" && (
        <div className="auth-reveal is-visible mx-auto w-full max-w-2xl rounded-2xl border border-[#b7ccef] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-5 text-center shadow-[0_12px_24px_rgba(36,76,184,0.10)] backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 text-[#2f63da]">
            <Clock className="h-5 w-5" />
            <p className="font-semibold text-[#1F3152]">Đơn của bạn đã được gửi</p>
          </div>
          <p className="mt-1.5 text-sm text-[#5C7094]">
            Vui lòng chờ. Kết quả sẽ có trong vòng 1-3 ngày làm việc.
          </p>
          <button
            type="button"
            onClick={() => void reloadRegistration()}
            disabled={isCheckingRegistration}
            className="auth-btn-gloss mx-auto mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#b7ccef] bg-[linear-gradient(135deg,#edf4ff_0%,#dfeaff_100%)] px-4 text-sm font-semibold text-[#244cb8] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="auth-btn-gloss__content inline-flex items-center justify-center gap-2">
              {isCheckingRegistration ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
              {isCheckingRegistration ? "Đang kiểm tra..." : "Kiểm tra lại"}
            </span>
          </button>
        </div>
      )}

      {submitError ? (
        <div className="auth-reveal is-visible flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/95 p-4 shadow-[0_12px_24px_rgba(239,68,68,0.16)]">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm font-medium text-red-800">{submitError}</p>
        </div>
      ) : null}

      {progressStatus === "completed" || progressStatus === "selected_bed" || progressStatus === "assigned_room" || progressStatus === "approved" ? (
        hasSelectedBed ? (
          <div className="auth-reveal is-visible mx-auto w-full max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50/95 p-5 text-center shadow-[0_12px_24px_rgba(16,185,129,0.16)]">
            <div className="flex items-center justify-center gap-2 text-emerald-700">
              <BedSingle className="h-5 w-5" />
              <p className="font-semibold text-emerald-900">Bạn đã chọn giường thành công</p>
            </div>
            <p className="mt-1.5 text-sm text-emerald-800/90">
              Phòng: <span className="font-bold">{assignedRoomName}</span>
            </p>
            <p className="mt-1 text-sm text-emerald-800/90">
              Giường: <span className="font-bold">{selectedBedName}</span>
            </p>
            <p className="mt-1.5 text-sm text-emerald-800/90">Vui lòng xem và ký hợp đồng để hoàn tất thủ tục đăng ký.</p>
            <div className="mx-auto mt-4 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => navigate("/student/contract")}
                className="auth-btn-gloss inline-flex h-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-4 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
              >
                <span className="auth-btn-gloss__content inline-flex items-center justify-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Ký hợp đồng
                </span>
              </button>
            </div>
          </div>
        ) : registrationForView?.assigned_room_id && assignedRoomName ? (
          <div className="auth-reveal is-visible mx-auto w-full max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50/95 p-5 text-center shadow-[0_12px_24px_rgba(16,185,129,0.16)]">
            <div className="flex items-center justify-center gap-2 text-emerald-700">
              <Home className="h-5 w-5" />
              <p className="font-semibold text-emerald-900">Bạn đã được phân phòng</p>
            </div>
            <p className="mt-1.5 text-sm text-emerald-800/90">
              Phòng: <span className="font-bold">{assignedRoomName}</span>
            </p>
            <p className="mt-1 text-sm text-emerald-800/90">Vui lòng chọn giường để hoàn tất đăng ký nội trú</p>
            <button
              type="button"
              onClick={() => navigate("/student/select-bed")}
              className="auth-btn-gloss mx-auto mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-4 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
            >
              <span className="auth-btn-gloss__content">Chọn giường</span>
            </button>
          </div>
        ) : (
          <div className="auth-reveal is-visible mx-auto w-full max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50/95 p-5 text-center shadow-[0_12px_24px_rgba(16,185,129,0.16)]">
            <div className="flex items-center justify-center gap-2 text-emerald-700">
              <CheckCircle className="h-5 w-5" />
              <p className="font-semibold text-emerald-900">Đơn đã được duyệt</p>
            </div>
            <p className="mt-1.5 text-sm text-emerald-800/90">
              Vui lòng chờ quản lý phân phòng (1-2 ngày)
            </p>
            <button
              type="button"
              onClick={() => void reloadRegistration()}
              disabled={isCheckingRegistration}
              className="auth-btn-gloss mx-auto mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#b7ccef] bg-[linear-gradient(135deg,#edf4ff_0%,#dfeaff_100%)] px-4 text-sm font-semibold text-[#244cb8] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="auth-btn-gloss__content inline-flex items-center justify-center gap-2">
                {isCheckingRegistration ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                {isCheckingRegistration ? "Đang kiểm tra..." : "Kiểm tra lại"}
              </span>
            </button>
          </div>
        )
      ) : null}

      {statusForView === "rejected" && (
        <div className="auth-reveal is-visible mx-auto w-full max-w-2xl rounded-2xl border border-red-200 bg-red-50/95 p-5 text-center shadow-[0_12px_24px_rgba(239,68,68,0.16)]">
          <div className="flex items-center justify-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p className="font-semibold text-red-900">Đơn đăng ký bị từ chối</p>
          </div>
          <p className="mt-1.5 text-sm text-red-700">Lý do: {rejectionReason}</p>
          <button
            type="button"
            onClick={openResubmit}
            className="auth-btn-gloss mx-auto mt-4 rounded-xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(204,60,79,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
          >
            <span className="auth-btn-gloss__content">Gửi lại đơn</span>
          </button>
        </div>
      )}

      {statusForView === "unregistered" || isReviewingSubmittedForm ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
          className="auth-reveal is-visible mt-2 rounded-[24px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_75%,#deebff_100%)] px-5 pb-6 pt-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-sm sm:mt-3 sm:px-6 sm:pt-6"
        >
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className={`space-y-6 ${isReviewingSubmittedForm ? "pointer-events-none select-none" : ""}`}
        >
          {isReviewingSubmittedForm ? (
            <div className="mb-2 rounded-2xl border border-[#b7ccef] bg-white/70 p-4 text-sm text-[#1F3152] shadow-[0_10px_20px_rgba(36,76,184,0.08)]">
              Đang hiển thị lại hồ sơ bạn đã nộp trước đó.
            </div>
          ) : null}

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

                      {documentFiles[field] && (
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-[#204178]">
                              {documentLabels[field]} <span className="text-red-500">*</span>
                            </p>
                          </div>
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#eef4ff_0%,#e2ecff_100%)] text-[#244CB8] transition-all duration-300 group-hover:bg-[#dce7ff] group-hover:shadow-[0_10px_22px_rgba(36,76,184,0.18)]">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                        </div>
                      )}

                      {documentFiles[field] ? (
                        <div className="mt-4 space-y-4">
                          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#eef4ff_0%,#e5efff_100%)]">
                            <img
                              src={documentPreviewUrls[field]}
                              alt={documentLabels[field]}
                              className="h-full w-full object-cover"
                              onError={(event) => {
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

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {accommodationFields.map(renderFormField)}
              </div>

              
            </div>

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
                        <li key={item}>
                          {item}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>

            {!isReviewingSubmittedForm ? (
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

                <div className="xl:col-span-2 flex justify-end gap-3 border-t border-[#DFE8F4] pt-4">
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
              </>
            ) : null}
          </div>
        </form>
        </motion.div>
      ) : null}
    </motion.section>
  );
}
