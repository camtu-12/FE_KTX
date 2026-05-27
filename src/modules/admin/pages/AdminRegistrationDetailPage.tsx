import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUp,
  CheckCircle,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  ImageOff,
  ShieldCheck,
  UserCircle2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  departmentOptions,
  documentLabels,
  genderOptions,
  relationshipOptions,
  statusMap,
  type RegistrationDocumentField,
  type RegistrationFormData,
  type RegistrationRequest,
  type RegistrationStatus,
} from "../data/registrationRequests";
import { getRegistrationById } from "../../../api/registrationService";
import { createPortal } from "react-dom";

const statusIconMap: Record<RegistrationStatus, typeof Clock3> = {
  pending: Clock3,
  approved: CheckCircle2,
  rejected: CircleAlert,
};

const readOnlyFieldClassName =
  "mt-1 h-11 w-full rounded-xl border border-[#D6E2F1] bg-[#F6F9FD] px-4 text-sm text-[#1F3152] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] read-only:cursor-default read-only:bg-[#F6F9FD] focus:outline-none";

const readOnlySelectClassName = `${readOnlyFieldClassName} appearance-none disabled:cursor-default disabled:opacity-100`;

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

const previewByField = {
  portraitPhoto: createPreviewSvg("Ảnh thẻ", "Ảnh hồ sơ", "#2f63da"),
  cccdFrontPhoto: createPreviewSvg("CCCD mặt trước", "Ảnh hồ sơ", "#2f63da"),
  cccdBackPhoto: createPreviewSvg("CCCD mặt sau", "Ảnh hồ sơ", "#31b7d4"),
} as const;

void previewByField;

const documentFieldConfigs = [
  { field: "portraitPhoto" },
  { field: "cccdFrontPhoto" },
  { field: "cccdBackPhoto" },
] as const;

const createEmptyDocumentErrorState = (): Record<RegistrationDocumentField, boolean> => ({
  portraitPhoto: false,
  cccdFrontPhoto: false,
  cccdBackPhoto: false,
});

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
] as const;

type DetailRouteState = {
  request?: RegistrationRequest;
  returnToModal?: boolean;
};

type FieldConfig = {
  name: keyof RegistrationFormData;
  label: string;
  type?: "text" | "tel" | "select";
  options?: Array<{ value: string; label: string }>;
  fullWidth?: boolean;
  helperText?: string;
};

const genderLabelMap = new Map(genderOptions.map((option) => [option.value, option.label]));
const departmentLabelMap = new Map(departmentOptions.map((option) => [option, option]));
const relationshipLabelMap = new Map(relationshipOptions.map((option) => [option.value, option.label]));

const formatDateDisplay = (value: string) => {
  if (!value) {
    return "";
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const isDateField = (field: keyof RegistrationFormData) =>
  field === "birthDate" || field === "cccdIssueDate" || field === "dormStartDate" || field === "dormEndDate";

export default function AdminRegistrationDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { registrationId } = useParams();
  const routeState = location.state as DetailRouteState | null;
  const [isScrollToTopVisible, setIsScrollToTopVisible] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ src: string; title: string } | null>(null);
  const [failedDocuments, setFailedDocuments] = useState<Record<RegistrationDocumentField, boolean>>(() =>
    createEmptyDocumentErrorState(),
  );
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});

  const [request, setRequest] = useState<RegistrationRequest | null>(routeState?.request ?? null);

  useEffect(() => {
    const id = Number(registrationId);
    console.log('[AdminRegistrationDetailPage] registrationId param:', registrationId, 'parsed id:', id);

    if (Number.isNaN(id) || id <= 0) {
      console.log('[AdminRegistrationDetailPage] invalid registrationId from URL, clearing');
      queueMicrotask(() => {
        setRequest(null);
      });
      return;
    }

    const snapshotRequest = routeState?.request;
    if (snapshotRequest && routeState.returnToModal && snapshotRequest.id === id) {
      console.log('[AdminRegistrationDetailPage] using routeState.request snapshot for id:', id);
      queueMicrotask(() => {
        setRequest(snapshotRequest);
        setFailedDocuments(createEmptyDocumentErrorState());
        setImageLoadErrors({});
      });
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        console.log('[AdminRegistrationDetailPage] calling getRegistrationById with id:', id);
        const res = await getRegistrationById(id);
        if (cancelled) return;
        
        // Detailed logging of the response
        console.log('[AdminRegistrationDetailPage] Full API Response:', {
          id: res?.id,
          status: res?.status,
          avatarUrl: res?.avatarUrl,
          cccdFrontUrl: res?.cccdFrontUrl,
          cccdBackUrl: res?.cccdBackUrl,
          documents: res?.documents,
          student: res?.student
        });
        
        console.log('[AdminRegistrationDetailPage] Image URLs:', {
          avatarUrl: res?.avatarUrl,
          cccdFrontUrl: res?.cccdFrontUrl,
          cccdBackUrl: res?.cccdBackUrl,
        });
        
        setRequest(res);
        setFailedDocuments(createEmptyDocumentErrorState());
        setImageLoadErrors({});
      } catch (err) {
        if (cancelled) return;
        console.log('[AdminRegistrationDetailPage] API error:', err);
        setRequest(null);
        setFailedDocuments(createEmptyDocumentErrorState());
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [registrationId, routeState?.request, routeState?.returnToModal]);

  useEffect(() => {
    if (!imagePreview) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setImagePreview(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [imagePreview]);

  useEffect(() => {
    const scrollContainer = document.querySelector(".auth-scrollbar") as HTMLElement | null;

    if (!scrollContainer) {
      return;
    }

    const updateVisibility = () => {
      const threshold = Math.max(180, scrollContainer.clientHeight * 0.6);
      setIsScrollToTopVisible(scrollContainer.scrollTop > threshold);
    };

    updateVisibility();
    scrollContainer.addEventListener("scroll", updateVisibility, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", updateVisibility);
    };
  }, []);

  const handleScrollToTop = () => {
    const scrollContainer = document.querySelector(".auth-scrollbar") as HTMLElement | null;

    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (routeState?.returnToModal) {
      navigate(-1);
      return;
    }

    navigate("/admin/registrations");
  };

  const formData = request?.formData;

  /**
   * Build storage URL for images - supports both local and Railway volume
   */
  const buildStorageUrl = (path?: string) => {
    if (!path) return "";

    // If it's already a full URL (including Railway's API endpoint), return as-is
    if (/^https?:\/\//i.test(path) || path.startsWith("data:")) {
      console.log('[buildStorageUrl] Already a URL:', path);
      return path;
    }

    const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "http://127.0.0.1:8000";
    const cleanApiBase = apiBase.replace(/\/+$/, "");
    
    const storageBase = cleanApiBase.endsWith("/api") ? cleanApiBase.slice(0, -4) : cleanApiBase;
    const normalizedPath = path.replace(/^\/+/, "");
    
    const finalUrl = `${storageBase}/storage/${normalizedPath}`;
    console.log('[buildStorageUrl] Original:', path, '-> Final:', finalUrl);
    return finalUrl;
  };

  const resolveDocumentSrc = (field: RegistrationDocumentField) => {
    if (!request) {
      console.log('[resolveDocumentSrc] No request object');
      return "";
    }

    let rawUrl = "";
    if (field === "portraitPhoto") {
      rawUrl = request.avatarUrl || request.documents?.[field] || "";
      console.log('[resolveDocumentSrc] portraitPhoto - request.avatarUrl:', request.avatarUrl);
      console.log('[resolveDocumentSrc] portraitPhoto - request.documents.portraitPhoto:', request.documents?.portraitPhoto);
      console.log('[resolveDocumentSrc] portraitPhoto - rawUrl:', rawUrl);
    } else if (field === "cccdFrontPhoto") {
      rawUrl = request.cccdFrontUrl || request.documents?.[field] || "";
      console.log('[resolveDocumentSrc] cccdFrontPhoto - request.cccdFrontUrl:', request.cccdFrontUrl);
      console.log('[resolveDocumentSrc] cccdFrontPhoto - rawUrl:', rawUrl);
    } else {
      rawUrl = request.cccdBackUrl || request.documents?.[field] || "";
      console.log('[resolveDocumentSrc] cccdBackPhoto - request.cccdBackUrl:', request.cccdBackUrl);
      console.log('[resolveDocumentSrc] cccdBackPhoto - rawUrl:', rawUrl);
    }

    if (!rawUrl) {
      console.log(`[resolveDocumentSrc] No URL for ${field}`);
      return "";
    }

    const finalUrl = buildStorageUrl(rawUrl);
    console.log(`[resolveDocumentSrc] ${field} finalUrl:`, finalUrl);
    return finalUrl;
  };

  const handleImageError = (field: RegistrationDocumentField, url: string) => {
    console.error(`[Image Error] Failed to load ${field}:`, url);
    setImageLoadErrors((prev) => ({ ...prev, [field]: true }));
    setFailedDocuments((prev) => ({ ...prev, [field]: true }));
  };

  const relationshipLabel = useMemo(() => {
    if (!formData) {
      return "";
    }

    return relationshipLabelMap.get(formData.relationship) ?? formData.relationship;
  }, [formData]);

  const renderField = (config: FieldConfig) => {
    if (!formData) {
      return null;
    }

    const fieldValue = formData[config.name] ?? "";
    const displayValue = isDateField(config.name)
      ? formatDateDisplay(fieldValue)
      : config.name === "gender"
        ? genderLabelMap.get(fieldValue) ?? fieldValue
        : config.name === "department"
          ? departmentLabelMap.get(fieldValue) ?? fieldValue
          : config.name === "relationship"
            ? relationshipLabel
            : fieldValue;
    const fieldId = `registration-${String(config.name)}`;

    return (
      <div key={String(config.name)} className={config.fullWidth ? "md:col-span-2" : ""}>
        <label htmlFor={fieldId} className="block text-sm font-medium text-[#5A7094]">
          {config.label}
        </label>
        {config.type === "select" ? (
          <select id={fieldId} value={fieldValue} disabled className={readOnlySelectClassName}>
            <option value="">{config.label}</option>
            {config.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={fieldId}
            type={config.type === "tel" ? "tel" : "text"}
            value={displayValue}
            readOnly
            tabIndex={-1}
            className={readOnlyFieldClassName}
          />
        )}
        {config.helperText ? <p className="mt-1 text-xs text-[#6F89B5]">{config.helperText}</p> : null}
      </div>
    );
  };

  if (!request || !formData) {
    return (
      <section className="flex h-full items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl rounded-[28px] border border-[#d4e1f2] bg-white p-8 text-center shadow-[0_18px_42px_rgba(15,23,42,0.10)]">
          <h1 className="text-2xl font-bold text-[#1a2d52]">Không tìm thấy đơn đăng ký</h1>
          <p className="mt-3 text-sm leading-7 text-[#5c7094]">
            Hồ sơ này có thể không tồn tại hoặc dữ liệu mẫu chưa được cấu hình.
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-6 rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(36,76,184,0.24)]"
          >
            Quay lại danh sách
          </button>
        </div>
      </section>
    );
  }

  const statusUi = statusMap[request.status];
  const StatusIcon = statusIconMap[request.status];
  const commitmentConfirmed = request.commitmentConfirmed ?? true;

  const studentInfoFields: FieldConfig[] = [
    { name: "mssv", label: "MSSV" },
    { name: "fullName", label: "Họ và tên" },
    { name: "birthDate", label: "Ngày sinh" },
    { name: "gender", label: "Giới tính", type: "select", options: genderOptions },
    { name: "class", label: "Lớp" },
    { name: "department", label: "Khoa", type: "select", options: departmentOptions.map((department) => ({ value: department, label: department })) },
    { name: "nationality", label: "Quốc tịch" },
    { name: "ethnicity", label: "Dân tộc" },
    { name: "religion", label: "Tôn giáo" },
  ];

  const identityFields: FieldConfig[] = [
    { name: "phone", label: "Số điện thoại", type: "tel" },
    { name: "cccd", label: "Số CCCD" },
    { name: "cccdIssueDate", label: "Ngày cấp" },
    { name: "cccdIssuePlace", label: "Nơi cấp" },
    { name: "address", label: "Địa chỉ thường trú", fullWidth: true },
  ];

  const familyFields: FieldConfig[] = [
    { name: "father_name", label: "Họ tên cha" },
    { name: "father_phone", label: "SĐT cha", type: "tel" },
    { name: "father_job", label: "Nghề nghiệp cha" },
    { name: "mother_name", label: "Họ tên mẹ" },
    { name: "mother_phone", label: "SĐT mẹ", type: "tel" },
    { name: "mother_job", label: "Nghề nghiệp mẹ" },
    { name: "familyContactAddress", label: "Địa chỉ liên hệ cha/mẹ", fullWidth: true },
    { name: "relationName", label: "Người liên hệ khẩn cấp" },
    { name: "relationPhone", label: "SĐT người liên hệ", type: "tel" },
    { name: "relationship", label: "Quan hệ", type: "select", options: relationshipOptions },
  ];

  const accommodationFields: FieldConfig[] = [
    { name: "dormStartDate", label: "Từ ngày" },
    { name: "dormEndDate", label: "Đến ngày" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex min-h-full flex-col space-y-6 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <motion.div
        transition={{ duration: 0.2 }}
        className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-sm sm:px-8"
      >
        <div className="relative pl-16 sm:pl-20">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Quay lại danh sách đơn"
            className="absolute left-0 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#c4d7f2] bg-white/90 text-[#40619a] shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-[#9cb9e7] hover:text-[#244cb8]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-[#1a2d52]">Chi tiết đơn đăng ký</h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-7 text-[#5c7094]">
                Bản xem lại hồ sơ sinh viên đã nộp, giữ nguyên toàn bộ nội dung và chỉ cho phép xem.
              </p>
            </div>

            <div className="pt-1 lg:pt-0">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${statusUi.className}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                <span>{statusUi.label}</span>
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06, ease: "easeOut" }}
        className="space-y-6 rounded-[24px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_75%,#deebff_100%)] px-5 pb-6 pt-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-sm sm:px-6 sm:pt-6"
      >
        <motion.div
          transition={{ duration: 0.22 }}
          className="space-y-4 rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)] sm:p-7"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#2d58c4] bg-[radial-gradient(circle_at_30%_30%,#2347a8_0%,#1b3e97_58%,#17347e_100%)] text-[#b7ccff] shadow-[inset_0_1px_0_rgba(132,166,244,0.30),0_12px_24px_rgba(36,76,184,0.18)]">
              <UserCircle2 className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">Bước 1</span>
              <h2 className="text-lg font-semibold text-[#1F3152]">Thông tin cá nhân</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {studentInfoFields.map(renderField)}
          </div>

          <div className="border-t border-[#d9e6f7] pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#5578AC]">Giấy tờ và liên hệ</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {identityFields.map(renderField)}
            </div>
          </div>
        </motion.div>

        <motion.div
          transition={{ duration: 0.22 }}
          className="rounded-[22px] border border-[#c9d8ef] bg-[linear-gradient(180deg,#eef5ff_0%,#e7f0ff_42%,#edf4fd_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold uppercase tracking-wide text-[#5578AC]">Hồ sơ ảnh đính kèm</h3>
              <p className="mt-1 text-sm text-[#6981aa]">Bản xem tài liệu sinh viên đã tải lên.</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:[grid-template-columns:repeat(3,minmax(0,15rem))] lg:justify-between lg:gap-8">
            {documentFieldConfigs.map(({ field }) => {
              const src = resolveDocumentSrc(field);
              const hasError = failedDocuments[field] || imageLoadErrors[field];
              const canPreview = Boolean(src) && !hasError;

              return (
                <div
                  key={field}
                  className="rounded-3xl border border-[#bfd2ec] bg-[linear-gradient(180deg,#f5f9ff_0%,#edf4ff_100%)] p-3 shadow-[inset_0_0_0_1px_rgba(185,205,234,0.24)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#204178]">{documentLabels[field]}</p>
                    </div>
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#eef4ff_0%,#e2ecff_100%)] text-[#244CB8]">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-[#cfdbef] bg-white">
                    {canPreview ? (
                      <img
                        src={src}
                        alt={documentLabels[field]}
                        className="h-48 w-full cursor-zoom-in object-cover"
                        role="button"
                        tabIndex={0}
                        onClick={() => setImagePreview({ src, title: documentLabels[field] })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setImagePreview({ src, title: documentLabels[field] });
                          }
                        }}
                        onError={() => handleImageError(field, src)}
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-48 w-full flex-col items-center justify-center gap-2 bg-white px-4 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3f7ff] text-[#6b86b5]">
                          <ImageOff className="h-6 w-6" />
                        </div>
                        <p className="text-xs font-semibold text-[#5a739e]">
                          {hasError ? "Không tải được ảnh" : "Chưa có ảnh"}
                        </p>
                        {src && hasError && (
                          <a
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 text-xs text-[#244CB8] hover:underline"
                          >
                            Thử mở trực tiếp
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {imagePreview
          ? createPortal(
              <div
                className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-[2px]"
                role="dialog"
                aria-modal="true"
                aria-label={imagePreview.title}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setImagePreview(null);
                  }
                }}
              >
                <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{imagePreview.title}</p>
                      <a
                        href={imagePreview.src}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#244CB8] hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Mở ở tab mới
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition hover:bg-slate-50"
                      aria-label="Đóng xem ảnh"
                      title="Đóng (Esc)"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex max-h-[calc(100vh-10rem)] items-center justify-center bg-slate-50 p-4 sm:p-6">
                    <img
                      src={imagePreview.src}
                      alt={imagePreview.title}
                      className="max-h-[calc(100vh-14rem)] w-full object-contain"
                    />
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}

        <motion.div
          transition={{ duration: 0.22 }}
          className="space-y-4 rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)] sm:p-7"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#3a67cf] bg-[radial-gradient(circle_at_30%_30%,#2b63da_0%,#244cb8_58%,#1c3f99_100%)] text-[#9ee5ff] shadow-[inset_0_1px_0_rgba(136,181,255,0.28),0_12px_24px_rgba(36,76,184,0.20)]">
              <ShieldCheck className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">Bước 2</span>
              <h2 className="text-lg font-semibold text-[#1F3152]">Thông tin người thân</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {familyFields.map(renderField)}
          </div>
        </motion.div>

        <motion.div
          transition={{ duration: 0.22 }}
          className="space-y-4 rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)] sm:p-7"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#3a67cf] bg-[radial-gradient(circle_at_30%_30%,#2b63da_0%,#244cb8_58%,#1c3f99_100%)] text-[#9ee5ff] shadow-[inset_0_1px_0_rgba(136,181,255,0.28),0_12px_24px_rgba(36,76,184,0.20)]">
              <Clock3 className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">Bước 3</span>
              <h2 className="text-lg font-semibold text-[#1F3152]">Thông tin lưu trú</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {accommodationFields.map(renderField)}
          </div>
        </motion.div>

        <motion.div
          transition={{ duration: 0.22 }}
          className="space-y-4 rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)] sm:p-7 xl:col-span-2"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#3a67cf] bg-[radial-gradient(circle_at_30%_30%,#2b63da_0%,#244cb8_58%,#1c3f99_100%)] text-[#9ee5ff] shadow-[inset_0_1px_0_rgba(136,181,255,0.28),0_12px_24px_rgba(36,76,184,0.20)]">
              <CheckCircle className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1F3152]">Cam kết của sinh viên</h2>
              <p className="mt-1 text-sm text-[#5C7094]">Phải đảm bảo tuân thủ các quy định và nội quy của ký túc xá</p>
            </div>
          </div>

          <div className="mt-6 space-y-5 text-sm leading-7 text-[#324B76]">
            {commitmentSections.map((section) => (
              <div key={section.title} className="rounded-[22px] border border-[#d8e5f6] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                <h3 className="text-base font-semibold text-[#1F3152]">{section.title}</h3>
                <ol className="mt-4 list-decimal space-y-2 pl-5">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-[#d8e5f6] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            <input
              type="checkbox"
              checked={commitmentConfirmed}
              readOnly
              disabled
              className="mt-1 h-5 w-5 flex-shrink-0 rounded-lg border-2 border-[#b7ccee] bg-white text-[#244CB8] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] accent-[#244CB8]"
            />
            <div className="flex-1 text-sm leading-6 text-[#324B76]">
              <p>Tôi cam kết thực hiện đúng nội quy, quy định của Nhà trường và chịu trách nhiệm về các thông tin đã kê khai. Nếu vi phạm, tôi xin chịu hoàn toàn trách nhiệm trước Nhà trường và pháp luật.</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {isScrollToTopVisible ? (
        <div className="fixed bottom-6 right-6 z-[70]">
          <button
            type="button"
            onClick={handleScrollToTop}
            className="group inline-flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_42%,#31b7d4_100%)] text-white shadow-[0_16px_32px_rgba(36,76,184,0.28)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
            aria-label="Về đầu trang chi tiết"
            title="Về đầu trang chi tiết"
          >
            <ArrowUp className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
          </button>
        </div>
      ) : null}
    </motion.section>
  );
}