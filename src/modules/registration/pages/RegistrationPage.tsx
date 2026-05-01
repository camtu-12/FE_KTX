import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, BedSingle, CheckCircle, Clock, ImagePlus, LoaderCircle, ShieldCheck, UserCircle2, Users, Home } from "lucide-react";
import {
  getLatestRegistrationByEmail,
  getLatestRegistrationByEmailInstant,
  getDormBedsForRoomInstant,
  submitRegistration,
  getDormRoomsInstant,
} from "../../../api/registrationMockApi";
import { getStoredAuth } from "../../auth/utils/authStorage";
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
  gender: string;
  class: string;
  department: string;
  phone: string;
  cccd: string;
  address: string;
  relationName: string;
  relationPhone: string;
  relationship: string;
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
  gender: "",
  class: "",
  department: "",
  phone: "",
  cccd: "",
  address: "",
  relationName: "",
  relationPhone: "",
  relationship: "",
};

const fieldLabels: Record<keyof FormData, string> = {
  mssv: "MSSV",
  fullName: "họ và tên",
  gender: "giới tính",
  class: "lớp",
  department: "khoa",
  phone: "số điện thoại",
  cccd: "số CCCD",
  address: "địa chỉ thường trú",
  relationName: "tên người thân",
  relationPhone: "số điện thoại người thân",
  relationship: "quan hệ",
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
  const storedAuth = getStoredAuth();
  const studentEmail = storedAuth?.user.email ?? "";
  const [initialRequestSnapshot] = useState(() =>
    (studentEmail ? getLatestRegistrationByEmailInstant(studentEmail) : null) as RegistrationWithAssignment | null,
  );
  const [registration, setRegistration] = useState<RegistrationWithAssignment | null>(initialRequestSnapshot);
  const [status, setStatus] = useState<RegistrationStatus>(initialRequestSnapshot?.status ?? "unregistered");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [documentFiles, setDocumentFiles] = useState<Record<DocumentField, File | null>>(initialDocumentFiles);
  const [draggingDocumentField, setDraggingDocumentField] = useState<DocumentField | null>(null);
  const [rejectionReason, setRejectionReason] = useState(initialRequestSnapshot?.rejectionReason ?? "");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [documentErrors, setDocumentErrors] = useState<Partial<Record<DocumentField, string>>>({});
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
        return;
      }

      nextPreviewUrls[field] = URL.createObjectURL(file);
    });

    return nextPreviewUrls;
  }, [documentFiles]);

  useEffect(() => {
    return () => {
      documentFieldConfigs.forEach(({ field }) => {
        const objectUrl = documentPreviewUrls[field];
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      });
    };
  }, [documentPreviewUrls]);

  useEffect(() => {
    let isMounted = true;

    const loadLatestStatus = async () => {
      if (!studentEmail) {
        if (isMounted) {
          setRegistration(null);
          setStatus("unregistered");
          setRejectionReason("");
        }
        return;
      }

      try {
        const latestRequest = (await getLatestRegistrationByEmail(studentEmail)) as RegistrationWithAssignment | null;
        if (!isMounted) {
          return;
        }

        if (!latestRequest) {
          setRegistration(null);
          setStatus("unregistered");
          setRejectionReason("");
          return;
        }

        setRegistration(latestRequest);
        setStatus(latestRequest.status);
        setRejectionReason(latestRequest.rejectionReason ?? "");
      } catch {
        // Keep current state when fetch fails.
      }
    };

    void loadLatestStatus();

    return () => {
      isMounted = false;
    };
  }, [studentEmail]);

  const getRegistration = async (): Promise<RegistrationWithAssignment | null> => {
    if (!studentEmail) {
      return null;
    }

    return (await getLatestRegistrationByEmail(studentEmail)) as RegistrationWithAssignment | null;
  };

  const reloadRegistration = async () => {
    setIsCheckingRegistration(true);

    try {
      const data = await getRegistration();
      setRegistration(data);

      if (!data) {
        setStatus("unregistered");
        setRejectionReason("");
        return;
      }

      setStatus(data.status);
      setRejectionReason(data.rejectionReason ?? "");
    } finally {
      setIsCheckingRegistration(false);
    }
  };

  const registrationForView = registration;

  const statusForView = registrationForView?.status ?? status;

  const assignedRoomName = (() => {
    const roomId = registrationForView?.assigned_room_id;
    if (!roomId) return null;

    const rooms = getDormRoomsInstant();
    const room = rooms.find((r) => r.id === roomId) ?? null;
    if (!room) return null;
    return `${room.building_code}${room.room_number}`;
  })();

  const selectedBedName = (() => {
    const roomId = registrationForView?.assigned_room_id;
    const bedId = registrationForView?.bedId;

    if (!roomId || !bedId) {
      return null;
    }

    const bed = getDormBedsForRoomInstant(roomId).find((item) => item.id === bedId);
    return bed ? `${bed.bed_number} (${bed.position === "upper" ? "Trên" : "Dưới"})` : `${bedId}`;
  })();

  const hasSelectedBed = Boolean(assignedRoomName && selectedBedName && registrationForView?.assigned_room_id && registrationForView?.bedId);
  const viewStatus = registrationForView?.bedId ? "completed" : statusForView;
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
    // Keep tiny files unchanged to avoid unnecessary quality loss.
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    const requiredFields = Object.keys(fieldLabels) as Array<keyof FormData>;
    const nextErrors: Partial<Record<keyof FormData, string>> = {};
    const nextDocumentErrors: Partial<Record<DocumentField, string>> = {};

    for (const field of requiredFields) {
      if (!formData[field].trim()) {
        nextErrors[field] = `Vui lòng điền ${fieldLabels[field]}`;
      }
    }

    for (const { field } of documentFieldConfigs) {
      if (!documentFiles[field]) {
        nextDocumentErrors[field] = `Vui lòng tải lên ${documentLabels[field]}`;
      }
    }

    if (Object.keys(nextErrors).length > 0 || Object.keys(nextDocumentErrors).length > 0) {
      setErrors(nextErrors);
      setDocumentErrors(nextDocumentErrors);

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
      const [portraitPhoto, cccdFrontPhoto, cccdBackPhoto] = await Promise.all([
        toDataUrl(documentFiles.portraitPhoto as File),
        toDataUrl(documentFiles.cccdFrontPhoto as File),
        toDataUrl(documentFiles.cccdBackPhoto as File),
      ]);

      const created = await submitRegistration({
        email: studentEmail,
        formData,
        documents: {
          portraitPhoto,
          cccdFrontPhoto,
          cccdBackPhoto,
        },
      });

      setRegistration(created as RegistrationWithAssignment);
      setStatus(created.status);
      setRejectionReason(created.rejectionReason ?? "");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không thể gửi đơn. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFormState = () => {
    setFormData({ ...initialFormData });
    setDocumentFiles({ ...initialDocumentFiles });
    setErrors({});
    setDocumentErrors({});
    clearDocumentInputs();
  };

  const handleReset = () => {
    resetFormState();
    setRegistration(null);
    setStatus("unregistered");
    setRejectionReason("");
  };

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
        <div className="auth-reveal is-visible flex items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50/95 p-4 shadow-[0_12px_24px_rgba(212,175,55,0.18)]">
          <Clock className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="font-semibold text-yellow-900">Đơn của bạn đã được gửi</p>
            <p className="text-sm text-yellow-800/85">
              Vui lòng chờ. Kết quả sẽ có trong vòng 1-3 ngày làm việc.
            </p>
          </div>
        </div>
      )}

      {submitError ? (
        <div className="auth-reveal is-visible flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/95 p-4 shadow-[0_12px_24px_rgba(239,68,68,0.16)]">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm font-medium text-red-800">{submitError}</p>
        </div>
      ) : null}

      {viewStatus === "completed" || viewStatus === "approved" ? (
        hasSelectedBed ? (
          <div className="auth-reveal is-visible mx-auto w-full max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50/95 p-5 text-center shadow-[0_12px_24px_rgba(16,185,129,0.16)]">
            <div className="flex items-center justify-center gap-2 text-emerald-700">
              <BedSingle className="h-5 w-5" />
              <p className="font-semibold text-emerald-900">Bạn đã hoàn tất đăng ký nội trú</p>
            </div>
            <p className="mt-1.5 text-sm text-emerald-800/90">
              Phòng: <span className="font-bold">{assignedRoomName}</span>
            </p>
            <p className="mt-1 text-sm text-emerald-800/90">
              Giường: <span className="font-bold">{selectedBedName}</span>
            </p>
            <button
              type="button"
              onClick={() => navigate("/student/room")}
              className="auth-btn-gloss mx-auto mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-4 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
            >
              <span className="auth-btn-gloss__content">Xem phòng của tôi</span>
            </button>
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
              onClick={reloadRegistration}
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
            onClick={handleReset}
            className="auth-btn-gloss mx-auto mt-4 rounded-xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(204,60,79,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
          >
            <span className="auth-btn-gloss__content">Gửi lại đơn</span>
          </button>
        </div>
      )}

      {statusForView === "unregistered" && (
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
            <motion.div
              transition={{ duration: 0.22 }}
              className="space-y-4 rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)] transition-all duration-300 ease-out hover:border-[#aac3ea] hover:shadow-[0_22px_44px_rgba(36,76,184,0.14)] sm:p-7"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#2d58c4] bg-[radial-gradient(circle_at_30%_30%,#2347a8_0%,#1b3e97_58%,#17347e_100%)] text-[#b7ccff] shadow-[inset_0_1px_0_rgba(132,166,244,0.30),0_12px_24px_rgba(36,76,184,0.18)]">
                  <UserCircle2 className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">
                      Bước 1
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-[#1F3152]">Thông tin cơ bản</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[#5A7094]">
                    MSSV <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="mssv"
                    value={formData.mssv}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.mssv = node;
                    }}
                    placeholder="Ví dụ: DH52201699"
                    className={getFieldClassName()}
                  />
                  {errors.mssv && <ErrorMessage message={errors.mssv} />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5A7094]">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.fullName = node;
                    }}
                    placeholder="Nhập họ và tên"
                    className={getFieldClassName()}
                  />
                  {errors.fullName && <ErrorMessage message={errors.fullName} />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5A7094]">
                    Giới tính <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.gender = node;
                    }}
                    className={getFieldClassName()}
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                  </select>
                  {errors.gender && <ErrorMessage message={errors.gender} />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5A7094]">
                    Lớp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="class"
                    value={formData.class}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.class = node;
                    }}
                    placeholder="Ví dụ: D22_TH03"
                    className={getFieldClassName()}
                  />
                  {errors.class && <ErrorMessage message={errors.class} />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5A7094]">
                    Khoa <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.department = node;
                    }}
                    className={getFieldClassName()}
                  >
                    <option value="">Chọn khoa</option>
                    {departmentOptions.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                  {errors.department && <ErrorMessage message={errors.department} />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5A7094]">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.phone = node;
                    }}
                    placeholder="Ví dụ: 0987654321"
                    className={getFieldClassName()}
                  />
                  {errors.phone && <ErrorMessage message={errors.phone} />}
                </div>
              </div>
            </motion.div>

            <motion.div
              transition={{ duration: 0.22 }}
              className="space-y-4 rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)] transition-all duration-300 ease-out hover:border-[#aac3ea] hover:shadow-[0_22px_44px_rgba(36,76,184,0.14)] sm:p-7"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#3a67cf] bg-[radial-gradient(circle_at_30%_30%,#2b63da_0%,#244cb8_58%,#1c3f99_100%)] text-[#9ee5ff] shadow-[inset_0_1px_0_rgba(136,181,255,0.28),0_12px_24px_rgba(36,76,184,0.20)]">
                  <ShieldCheck className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">
                      Bước 2
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-[#1F3152]">Chứng thực</h2>
                </div>
              </div>

              <div className="h-px w-full bg-[#D9E6F7]" />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold uppercase tracking-wide text-[#5A7094]">
                    Số CCCD <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cccd"
                    value={formData.cccd}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.cccd = node;
                    }}
                    placeholder="Ví dụ: 021234567890"
                    className={getStep2FieldClassName()}
                  />
                  {errors.cccd && <ErrorMessage message={errors.cccd} />}
                </div>

                <div>
                  <label className="block text-sm font-semibold uppercase tracking-wide text-[#5A7094]">
                    Địa chỉ thường trú <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.address = node;
                    }}
                    placeholder="Nhập địa chỉ thường trú"
                    className={getStep2FieldClassName()}
                  />
                  {errors.address && <ErrorMessage message={errors.address} />}
                </div>
              </div>

              <div className="rounded-[22px] border border-[#c9d8ef] bg-[linear-gradient(180deg,#eef5ff_0%,#e7f0ff_42%,#edf4fd_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] transition-all duration-300 hover:border-[#9fbde9] hover:shadow-[0_16px_30px_rgba(36,76,184,0.10)] sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold uppercase tracking-wide text-[#5578AC]">Hồ sơ ảnh đính kèm</h3>
                  </div>
                    <span className="w-fit rounded-full bg-[linear-gradient(135deg,#244CB8_0%,#4F7FF1_100%)] px-3 py-1 text-xs font-semibold text-white shadow-[0_8px_16px_rgba(36,76,184,0.22)]">
                    JPG, PNG, WEBP
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-6  md:grid-cols-2 lg:[grid-template-columns:repeat(3,minmax(0,15rem))] lg:justify-between lg:gap-8">
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
                        className={`group h-full rounded-3xl border-2 border-dashed p-3 transition-all duration-300 ease-out ${
                          documentErrors[field]
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
            </motion.div>

            <motion.div
              transition={{ duration: 0.22 }}
              className="space-y-4 rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)] transition-all duration-300 ease-out hover:border-[#aac3ea] hover:shadow-[0_22px_44px_rgba(36,76,184,0.14)] sm:p-7"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#315ec7] bg-[radial-gradient(circle_at_30%_30%,#2558c7_0%,#214cb3_55%,#193d8f_100%)] text-[#9fd4ff] shadow-[inset_0_1px_0_rgba(120,169,255,0.26),0_12px_24px_rgba(36,76,184,0.18)]">
                  <Users className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">
                      Bước 3
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-[#1F3152]">Người thân</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[#5A7094]">
                    Tên người thân <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="relationName"
                    value={formData.relationName}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.relationName = node;
                    }}
                    placeholder="Nhập tên người thân"
                    className={getFieldClassName()}
                  />
                  {errors.relationName && <ErrorMessage message={errors.relationName} />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5A7094]">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="relationPhone"
                    value={formData.relationPhone}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.relationPhone = node;
                    }}
                    placeholder="Ví dụ: 0987654321"
                    className={getFieldClassName()}
                  />
                  {errors.relationPhone && <ErrorMessage message={errors.relationPhone} />}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[#5A7094]">
                    Quan hệ <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.relationship = node;
                    }}
                    className={getFieldClassName()}
                  >
                    <option value="">Chọn quan hệ</option>
                    <option value="parent">Cha/Mẹ</option>
                    <option value="sibling">Anh/Chị/Em</option>
                    <option value="grandparent">Ông/Bà</option>
                    <option value="other">Khác</option>
                  </select>
                  {errors.relationship && <ErrorMessage message={errors.relationship} />}
                </div>
              </div>
            </motion.div>

            <div className="flex justify-end gap-3 border-t border-[#DFE8F4] pt-6">
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
          </form>
        </motion.div>
      )}
    </motion.section>
  );
}
