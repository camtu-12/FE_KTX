import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Award,
  CheckCircle,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  IdCard,
  ImagePlus,
  Loader2,
  LoaderCircle,
  Mail,
  Search,
  Upload,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPriorityCriteria } from "../../../api/registrationApi";
import { getRegistrationPeriods } from "../../../api/registrationApi";
import {
  claimReservationPriority,
  createDormReservation,
  uploadReservationDocument,
  uploadReservationPriorityEvidence,
  verifyAdmissionCandidate,
  type CandidateVerifyResult,
  type DormReservation,
  type ReservationPriority,
} from "../../../api/dormReservationApi";
import ReservationProgressCard from "../components/ReservationProgressCard";

type Step = "verify" | "existing" | "form" | "success";
type DocumentField = "portraitPhoto" | "cccdFrontPhoto" | "cccdBackPhoto";
type BlurLevel = "ok" | "warn" | "blur" | "small" | "analyzing" | null;

const docFieldToUploadType: Record<DocumentField, "avatar" | "cccd_front" | "cccd_back"> = {
  portraitPhoto: "avatar",
  cccdFrontPhoto: "cccd_front",
  cccdBackPhoto: "cccd_back",
};
const documentLabels: Record<DocumentField, string> = {
  portraitPhoto: "Ảnh đại diện",
  cccdFrontPhoto: "CCCD mặt trước",
  cccdBackPhoto: "CCCD mặt sau",
};
const documentHints: Record<DocumentField, string> = {
  portraitPhoto: "Chọn ảnh chân dung rõ mặt",
  cccdFrontPhoto: "Ảnh rõ nét, không bị chói",
  cccdBackPhoto: "Ảnh rõ nét, không bị chói",
};
const DOC_FIELDS: DocumentField[] = ["portraitPhoto", "cccdFrontPhoto", "cccdBackPhoto"];
const acceptedDocTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxDocSize = 5 * 1024 * 1024;

// ── Registration-form styles (matches RegistrationPage.tsx) ─────────────────
const regCard =
  "rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)] transition-all duration-300 ease-out hover:border-[#aac3ea] hover:shadow-[0_22px_44px_rgba(36,76,184,0.14)] sm:p-7";
const regInputCls =
  "mt-1 h-11 w-full rounded-xl border border-[#D6E2F1] bg-[#F6F9FD] px-4 text-sm text-[#1F3152] placeholder:text-[#90A2BF] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-all duration-300 ease-out hover:border-[#B9CDEE] hover:bg-white hover:shadow-[0_14px_28px_rgba(36,76,184,0.10)] focus:border-[#244CB8] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#244CB8]/14";
const regLabelCls = "block text-sm font-medium text-[#5A7094]";
const regIconInput = (extra = "") =>
  `${regInputCls} pl-11 ${extra}`;

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_22px_40px_rgba(36,76,184,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";
const secondaryBtn =
  "inline-flex items-center gap-2 rounded-2xl border border-[#c5d4f0] bg-[linear-gradient(135deg,#ffffff_0%,#f1f6ff_48%,#e8f0ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#244CB8] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_22px_rgba(36,76,184,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a9c0ea] hover:text-[#173D97] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_16px_28px_rgba(36,76,184,0.16)] active:scale-[0.98] disabled:opacity-50";

const genderLabel: Record<string, string> = { male: "Nam", female: "Nữ" };
export default function FreshmanReservationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("verify");

  // verify form
  const [admissionCode, setAdmissionCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<CandidateVerifyResult | null>(null);
  const [candidate, setCandidate] = useState<CandidateVerifyResult | null>(null);

  // reservation form
  const [periods, setPeriods] = useState<Array<{ id: number; name: string; schoolYear: string; semester: string }>>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number | "">("");
  const [email, setEmail] = useState("");
  const [commitmentConfirm, setCommitmentConfirm] = useState(false);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // success
  const [reservation, setReservation] = useState<DormReservation | null>(null);

  // document uploads (avatar, cccd)
  const initDocFiles = (): Record<DocumentField, File | null> => ({ portraitPhoto: null, cccdFrontPhoto: null, cccdBackPhoto: null });
  const initBlurStatus = (): Record<DocumentField, BlurLevel> => ({ portraitPhoto: null, cccdFrontPhoto: null, cccdBackPhoto: null });
  const [documentFiles, setDocumentFiles] = useState<Record<DocumentField, File | null>>(initDocFiles());
  const [documentErrors, setDocumentErrors] = useState<Partial<Record<DocumentField, string>>>({});
  const [blurStatus, setBlurStatus] = useState<Record<DocumentField, BlurLevel>>(initBlurStatus());
  const [draggingDocField, setDraggingDocField] = useState<DocumentField | null>(null);
  const documentRefs = useRef<Partial<Record<DocumentField, HTMLInputElement | null>>>({});

  // priority
  type PriorityCriteriaItem = { id: number; code: string | null; name: string; description: string | null; priority_score: number; tier: number | null };
  const [criteria, setCriteria] = useState<PriorityCriteriaItem[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState<Set<number>>(new Set());
  const [evidenceFiles, setEvidenceFiles] = useState<Map<number, File>>(new Map());
  const [claimedPriorities, setClaimedPriorities] = useState<ReservationPriority[]>([]);

  const documentPreviewUrls = useMemo(() => {
    const urls: Record<DocumentField, string> = { portraitPhoto: "", cccdFrontPhoto: "", cccdBackPhoto: "" };
    DOC_FIELDS.forEach((f) => { const file = documentFiles[f]; if (file) urls[f] = URL.createObjectURL(file); });
    return urls;
  }, [documentFiles]);

  useEffect(() => {
    if (step === "form") {
      setCriteriaLoading(true);
      getPriorityCriteria()
        .then((data: unknown) => {
          const arr = data as PriorityCriteriaItem[];
          setCriteria(arr.filter((c) => (c as unknown as { is_active?: boolean }).is_active !== false));
        })
        .catch(() => null)
        .finally(() => setCriteriaLoading(false));
    }
  }, [step]);

  useEffect(() => {
    if (step === "form") {
      setPeriodsLoading(true);
      getRegistrationPeriods()
        .then((data: Array<{ id: number; name: string; school_year?: string; semester?: string; allow_admission_candidates?: boolean; status?: string }>) => {
          const available = data
            .filter((p) => p.allow_admission_candidates && p.status === "active")
            .map((p) => ({
              id: p.id,
              name: p.name,
              schoolYear: p.school_year ?? "",
              semester: p.semester ?? "",
            }));
          setPeriods(available);
          if (available.length >= 1) setSelectedPeriod(available[0].id);
        })
        .catch(() => null)
        .finally(() => setPeriodsLoading(false));
    }
  }, [step]);

  const handleVerify = async () => {
    setVerifyError(null);
    setVerifyResult(null);
    if (!admissionCode.trim()) { setVerifyError("Vui lòng nhập mã hồ sơ trúng tuyển."); return; }
    setVerifyLoading(true);
    try {
      const result = await verifyAdmissionCandidate({
        admission_code: admissionCode.trim(),
      });
      if (result.existingReservation) {
        setCandidate(null);
        setVerifyResult(result);
        setStep("existing");
        return;
      }
      if (result.verificationStatus === "admitted") {
        setCandidate(result);
        setStep("form");
        return;
      }

      setCandidate(null);
      setVerifyResult(result);
      if (result.verificationStatus === "cancelled") {
        setVerifyError("Hồ sơ trúng tuyển đã bị hủy hoặc không còn hiệu lực. Vui lòng liên hệ nhà trường để được hỗ trợ.");
      } else if (result.verificationStatus === "not_found") {
        setVerifyError("Không tìm thấy hồ sơ trúng tuyển phù hợp.");
      }
    } catch (err: unknown) {
      setVerifyError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Xác minh thất bại. Vui lòng kiểm tra lại thông tin.",
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  const analyzeBlur = (file: File): Promise<BlurLevel> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, 400 / Math.max(img.width, img.height));
        const w = Math.max(1, Math.floor(img.width * scale));
        const h = Math.max(1, Math.floor(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve("ok"); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const gray: number[] = [];
        for (let i = 0; i < data.length; i += 4) gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        let sumSq = 0, count = 0;
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const lap = -4 * gray[idx] + gray[idx - 1] + gray[idx + 1] + gray[idx - w] + gray[idx + w];
          sumSq += lap * lap; count++;
        }
        const v = count > 0 ? sumSq / count : 0;
        resolve(v >= 100 ? "ok" : v >= 50 ? "warn" : "blur");
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve("ok"); };
      img.src = url;
    });

  const setDocumentFile = (field: DocumentField, file: File) => {
    if (!acceptedDocTypes.has(file.type)) {
      setDocumentErrors((p) => ({ ...p, [field]: "Ảnh phải có định dạng JPG, PNG hoặc WEBP." }));
      setDocumentFiles((p) => ({ ...p, [field]: null }));
      return;
    }
    if (file.size > maxDocSize) {
      setDocumentErrors((p) => ({ ...p, [field]: "Ảnh vượt quá 5 MB. Vui lòng chọn ảnh nhỏ hơn." }));
      setDocumentFiles((p) => ({ ...p, [field]: null }));
      return;
    }
    setDocumentErrors((p) => { const n = { ...p }; delete n[field]; return n; });
    setBlurStatus((p) => ({ ...p, [field]: "analyzing" }));
    void analyzeBlur(file).then((result) => {
      if (result === "blur") {
        setBlurStatus((p) => ({ ...p, [field]: "blur" }));
        setDocumentErrors((p) => ({ ...p, [field]: "Ảnh quá mờ. Vui lòng chụp lại trong điều kiện đủ sáng." }));
        setDocumentFiles((p) => ({ ...p, [field]: null }));
        if (documentRefs.current[field]) documentRefs.current[field]!.value = "";
      } else {
        setBlurStatus((p) => ({ ...p, [field]: result }));
        setDocumentFiles((p) => ({ ...p, [field]: file }));
      }
    });
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const field = e.target.name as DocumentField;
    const file = e.target.files?.[0];
    if (file) setDocumentFile(field, file);
  };
  const handleDocDragOver = (field: DocumentField, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "copy";
    if (draggingDocField !== field) setDraggingDocField(field);
  };
  const handleDocDragLeave = (field: DocumentField, e: React.DragEvent<HTMLDivElement>) => {
    const rel = e.relatedTarget;
    if (rel instanceof Node && e.currentTarget.contains(rel)) return;
    if (draggingDocField === field) setDraggingDocField(null);
  };
  const handleDocDrop = (field: DocumentField, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDraggingDocField(null);
    const file = e.dataTransfer.files?.[0];
    if (file) setDocumentFile(field, file);
  };
  const openDocPicker = (field: DocumentField) => documentRefs.current[field]?.click();

  const handleSubmit = async () => {
    setSubmitError(null);
    const errors: Record<string, string> = {};
    if (!selectedPeriod)         errors.period          = "Vui lòng chọn đợt đăng ký.";
    if (!commitmentConfirm)      errors.commitment_confirm = "Vui lòng xác nhận cam kết trước khi gửi hồ sơ.";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitLoading(true);
    try {
      const payload: Parameters<typeof createDormReservation>[0] = {
        admission_code: admissionCode.trim(),
        registration_period_id: selectedPeriod as number,
        ...(email.trim() ? { email: email.trim() } : {}),
        commitment_confirm: true,
      };
      const res = await createDormReservation(payload);
      const created = res.reservation;
      setReservation(created);

      // Upload documents (avatar, cccd) if provided
      for (const field of DOC_FIELDS) {
        const file = documentFiles[field];
        if (file) {
          try { await uploadReservationDocument(created.id, created.reservationCode ?? "", docFieldToUploadType[field], file); }
          catch { /* non-blocking */ }
        }
      }

      if (selectedCriteria.size > 0) {
        const claimed: ReservationPriority[] = [];
        for (const criteriaId of Array.from(selectedCriteria)) {
          try {
            const { priority } = await claimReservationPriority(created.id, created.reservationCode ?? "", criteriaId);
            const file = evidenceFiles.get(criteriaId);
            if (file) await uploadReservationPriorityEvidence(priority.id, created.reservationCode ?? "", file);
            claimed.push(priority);
          } catch { /* individual failure does not block */ }
        }
        setClaimedPriorities(claimed);
      }

      setStep("success");
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      if (data?.errors && Object.keys(data.errors).length > 0) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.errors)) mapped[k] = Array.isArray(v) ? v[0] : String(v);
        setFormErrors(mapped);
      } else {
        setSubmitError(data?.message ?? "Không thể gửi hồ sơ. Vui lòng thử lại.");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetAll = () => {
    setStep("verify"); setCandidate(null);
    setVerifyResult(null);
    setAdmissionCode("");
    setSelectedPeriod(""); setEmail("");
    setCommitmentConfirm(false);
    setDocumentFiles(initDocFiles()); setDocumentErrors({}); setBlurStatus(initBlurStatus());
    setReservation(null); setCriteria([]); setSelectedCriteria(new Set());
    setEvidenceFiles(new Map()); setClaimedPriorities([]);
  };

  // ── Helper: section icon (matches RegistrationPage gradient) ──────────────
  function SectionIcon({ icon, variant = "blue" }: { icon: React.ReactNode; variant?: "blue" | "dark" | "teal" }) {
    const bg = {
      blue: "border border-[#3a67cf] bg-[radial-gradient(circle_at_30%_30%,#2b63da_0%,#244cb8_58%,#1c3f99_100%)] text-[#9ee5ff] shadow-[inset_0_1px_0_rgba(136,181,255,0.28),0_12px_24px_rgba(36,76,184,0.20)]",
      dark: "border border-[#315ec7] bg-[radial-gradient(circle_at_30%_30%,#2558c7_0%,#214cb3_55%,#193d8f_100%)] text-[#9fd4ff] shadow-[inset_0_1px_0_rgba(120,169,255,0.26),0_12px_24px_rgba(36,76,184,0.18)]",
      teal: "border border-[#2a7cb8] bg-[radial-gradient(circle_at_30%_30%,#1f7ab8_0%,#1a6ca8_58%,#145994_100%)] text-[#a5dfff] shadow-[inset_0_1px_0_rgba(100,190,255,0.26),0_12px_24px_rgba(36,76,184,0.18)]",
    }[variant];
    return (
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] ${bg}`}>
        {icon}
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-110px)] overflow-hidden bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] px-4 py-5 sm:py-6">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#2f63da]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-7rem] top-28 h-80 w-80 rounded-full bg-[#31b7d4]/12 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(#2f63da0f_1px,transparent_1px),linear-gradient(90deg,#2f63da0f_1px,transparent_1px)] [background-size:34px_34px]" />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative mx-auto max-w-2xl"
      >
        {/* Header */}
        <div className="mb-5 text-center">
          <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_62%,#31b7d4_100%)] text-white shadow-[0_18px_34px_rgba(36,76,184,0.24)] ring-8 ring-white/70">
            <GraduationCap className="h-8 w-8" />
          </span>
          <h1 className="text-[2rem] font-extrabold leading-tight text-[#15305f] sm:text-[2.25rem]">
            Đăng ký KTX tân sinh viên
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#5f7498] sm:text-base">
            Dành cho tân sinh viên. Hồ sơ này sẽ tự động tạo đơn đăng ký lưu trú khi bạn xác nhận nhập học.
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-5 flex items-center justify-center rounded-[1.25rem] border border-[#cfdcf0] bg-white/90 px-4 py-3 text-sm font-semibold shadow-[0_12px_28px_rgba(36,76,184,0.10)] backdrop-blur-xl">
          {(["verify", "form", "success"] as const).map((s, i) => {
            const labels = ["Xác minh", "Đăng ký", "Hoàn tất"];
            const flowStep = step === "existing" ? "verify" : step;
            const current = flowStep === s;
            const done = ["verify", "form", "success"].indexOf(flowStep) > i;
            return (
              <div key={s} className="flex flex-1 items-center last:flex-none sm:flex-none">
                <div className="flex min-w-0 flex-col items-center gap-2 sm:min-w-[6.5rem]">
                  <motion.span
                    layout
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-extrabold shadow-sm transition-all duration-300 ${
                      current
                        ? "border-[#244cb8] bg-[#244cb8] text-white shadow-[0_12px_24px_rgba(36,76,184,0.25)]"
                        : done
                          ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_10px_20px_rgba(16,185,129,0.20)]"
                          : "border-[#d8e3f3] bg-[#f2f6fb] text-[#8ba0bf]"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                  </motion.span>
                  <span className={`truncate text-xs font-bold transition-colors duration-300 ${current ? "text-[#244cb8]" : done ? "text-emerald-600" : "text-[#8fa0b8]"}`}>
                    {labels[i]}
                  </span>
                </div>
                {i < 2 && (
                  <div className="mx-2 h-px flex-1 rounded-full bg-[#c9d8ef] sm:w-20 sm:flex-none">
                    <div className={`h-full rounded-full transition-all duration-300 ${done ? "w-full bg-emerald-500" : current ? "w-1/2 bg-[#244cb8]" : "w-0 bg-[#244cb8]"}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 1: Verify ── */}
          {step === "verify" && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-5 shadow-[0_14px_30px_rgba(36,76,184,0.08)] sm:p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <SectionIcon icon={<Search className="h-5 w-5 stroke-[2.2]" />} variant="blue" />
                <h2 className="text-lg font-semibold text-[#1F3152]">Xác minh thí sinh trúng tuyển</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={regLabelCls}>Mã hồ sơ trúng tuyển <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <FileText className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#90A2BF]" />
                    <input
                      type="text"
                      value={admissionCode}
                      onChange={(e) => { setAdmissionCode(e.target.value); setVerifyError(null); setVerifyResult(null); }}
                      placeholder="Ví dụ: 01_TT_XTS_GBTT_00319"
                      className={regIconInput()}
                    />
                  </div>
                </div>

                {verifyError && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {verifyError}
                  </div>
                )}

                {verifyResult?.verificationStatus === "enrolled" && (
                  <div className="rounded-[18px] border border-sky-200 bg-[linear-gradient(180deg,#f0f9ff_0%,#ffffff_100%)] p-4 text-[#1F3152] shadow-[0_12px_26px_rgba(36,76,184,0.08)]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-600">
                        <CheckCircle2 className="h-5 w-5 stroke-[2.4]" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">Bạn đã chính thức là sinh viên của trường.</p>
                        <p className="mt-1 text-sm font-medium text-[#5C7094]">Vui lòng đăng ký ký túc xá bằng MSSV.</p>
                      </div>
                    </div>
                  </div>
                )}

                {verifyResult?.verificationStatus !== "enrolled" && (
                  <>
                    <button type="button" disabled={verifyLoading} onClick={() => void handleVerify()} className={`${primaryBtn} w-full h-11`}>
                      {verifyLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                      Xác minh và tiếp tục
                    </button>
                    <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-sm font-medium text-[#5C7094]">
                      <span>Đã đăng ký giữ chỗ trước đó?</span>
                      <button
                        type="button"
                        onClick={() => navigate("/freshman-reservation/status")}
                        className="inline-flex items-center gap-1 font-semibold text-[#244CB8] transition-colors hover:text-[#173D97]"
                      >
                        <Search className="h-4 w-4" />
                        Tra cứu trạng thái hồ sơ
                      </button>
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {step === "existing" && verifyResult?.existingReservation && (
            <motion.div
              key="existing"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="contents"
            >
              <ReservationProgressCard
                reservation={verifyResult.existingReservation}
                message={verifyResult.message}
                onCheckAnother={resetAll}
                onOpenLookup={() => navigate("/freshman-reservation/status", {
                  state: { reservationCode: verifyResult.existingReservation?.reservationCode ?? "" },
                })}
                onLogin={() => navigate("/login")}
              />
            </motion.div>
          )}

          {/* ── Step 2: Form ── */}
          {step === "form" && candidate && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="space-y-5"
            >
              {/* Candidate info card */}
              <div className="rounded-[22px] border border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#f3fcf7_100%)] p-5 shadow-[0_14px_30px_rgba(16,185,129,0.10)] sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <CheckCircle2 className="h-5 w-5 stroke-[2.4]" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold text-[#1F3152]">Thông tin thí sinh đã xác minh</h2>
                </div>
                <dl className="mx-auto grid max-w-5xl grid-cols-1 gap-x-16 gap-y-6 text-base md:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-sm font-medium text-[#6F84A7]">Họ và tên</dt>
                    <dd className="mt-1 text-lg font-semibold text-[#1F3152]">{candidate.fullName}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-sm font-medium text-[#6F84A7]">Giới tính</dt>
                    <dd className="mt-1 font-semibold text-[#1F3152]">
                      {candidate.gender ? genderLabel[candidate.gender] ?? candidate.gender : ""}
                    </dd>
                  </div>
                  {candidate.majorName && (
                    <div className="min-w-0">
                      <dt className="text-sm font-medium text-[#6F84A7]">Ngành học</dt>
                      <dd className="mt-1 font-semibold text-[#1F3152]">{candidate.majorName}</dd>
                    </div>
                  )}
                  {candidate.courseYear?.trim() && (
                    <div className="min-w-0">
                      <dt className="text-sm font-medium text-[#6F84A7]">Khóa</dt>
                      <dd className="mt-1 font-semibold text-[#1F3152]">{candidate.courseYear}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Registration info */}
              <div className={regCard}>
                <div className="flex items-start gap-3">
                  <SectionIcon icon={<ClipboardList className="h-5 w-5 stroke-[2.2]" />} variant="blue" />
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">Bước 1</span>
                    <h2 className="text-lg font-semibold text-[#1F3152]">Thông tin đăng ký</h2>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className={regLabelCls}>Đợt đăng ký <span className="text-red-500">*</span></label>
                    {(formErrors.period || formErrors.registration_period_id) && (
                      <p className="mt-0.5 text-xs text-rose-600">{formErrors.period ?? formErrors.registration_period_id}</p>
                    )}
                    {periodsLoading ? (
                      <div className="mt-1 flex h-11 items-center gap-2 text-sm text-[#62789f]">
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải đợt đăng ký...
                      </div>
                    ) : periods.length === 0 ? (
                      <div className="mt-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                        Hiện tại chưa có đợt đăng ký giữ chỗ tân sinh viên nào đang mở.
                      </div>
                    ) : periods.length === 1 ? (
                      <div className={`${regInputCls} flex items-center`}>
                        <span className="text-[#1F3152] font-medium">{periods[0].name}{periods[0].schoolYear ? ` (${periods[0].schoolYear})` : ""}</span>
                        <span className="ml-auto text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5">Đang mở</span>
                      </div>
                    ) : (
                      <select
                        value={selectedPeriod}
                        onChange={(e) => { setSelectedPeriod(e.target.value ? Number(e.target.value) : ""); setFormErrors((p) => ({ ...p, period: "", registration_period_id: "" })); }}
                        className={`${regInputCls} appearance-none`}
                      >
                        <option value="">— Chọn đợt đăng ký —</option>
                        {periods.map((p) => <option key={p.id} value={p.id}>{p.name}{p.schoolYear ? ` (${p.schoolYear})` : ""}</option>)}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className={regLabelCls}>Email cá nhân</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#90A2BF]" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="a@gmail.com" className={regIconInput()} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Document uploads */}
              <div className="rounded-[22px] border border-[#c9d8ef] bg-[linear-gradient(180deg,#eef5ff_0%,#e7f0ff_42%,#edf4fd_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] transition-all duration-300 hover:border-[#9fbde9] hover:shadow-[0_16px_30px_rgba(36,76,184,0.10)] sm:p-6">
                <div className="flex items-start gap-3">
                  <SectionIcon icon={<IdCard className="h-5 w-5 stroke-[2.2]" />} variant="teal" />
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">Bước 2</span>
                    <h2 className="text-lg font-semibold text-[#1F3152]">Hình ảnh & giấy tờ</h2>
                    <p className="mt-0.5 text-sm text-[#5C7094]">Ảnh đại diện và CCCD để BQL xác minh — kéo thả hoặc nhấn để chọn</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-[linear-gradient(135deg,#244CB8_0%,#4F7FF1_100%)] px-3 py-1 text-xs font-semibold text-white shadow-[0_8px_16px_rgba(36,76,184,0.22)]">
                    JPG · PNG · WEBP · tối đa 5 MB
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {DOC_FIELDS.map((field) => (
                    <div key={field}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => openDocPicker(field)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDocPicker(field); } }}
                        onDragOver={(e) => handleDocDragOver(field, e)}
                        onDragEnter={(e) => handleDocDragOver(field, e)}
                        onDragLeave={(e) => handleDocDragLeave(field, e)}
                        onDrop={(e) => handleDocDrop(field, e)}
                        className={`group h-full cursor-pointer rounded-3xl border-2 border-dashed p-3 transition-all duration-300 ease-out ${
                          documentErrors[field]
                            ? "border-red-400/70 bg-red-50"
                            : draggingDocField === field
                              ? "border-[#244CB8] bg-white shadow-[0_24px_46px_rgba(36,76,184,0.16)]"
                              : documentFiles[field]
                                ? "border-[#B8CDEA] bg-white hover:border-[#244CB8] hover:shadow-[0_18px_36px_rgba(36,76,184,0.14)]"
                                : "border-[#bfd2ec] bg-[linear-gradient(180deg,#f5f9ff_0%,#edf4ff_100%)] hover:border-[#8fb3e5] hover:bg-white hover:shadow-[0_18px_34px_rgba(36,76,184,0.12)]"
                        }`}
                      >
                        <input
                          type="file"
                          name={field}
                          accept="image/jpeg,image/png,image/webp"
                          ref={(node) => { documentRefs.current[field] = node; }}
                          onChange={handleDocChange}
                          className="sr-only"
                        />

                        {(documentFiles[field] || blurStatus[field] === "analyzing") && (
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-sm font-semibold text-[#204178]">{documentLabels[field]}</p>
                            <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
                              blurStatus[field] === "ok" ? "bg-emerald-50 text-emerald-600"
                              : blurStatus[field] === "warn" ? "bg-amber-50 text-amber-500"
                              : blurStatus[field] === "analyzing" ? "bg-[#eef4ff] text-[#244CB8]"
                              : "bg-[linear-gradient(180deg,#eef4ff_0%,#e2ecff_100%)] text-[#244CB8]"
                            }`}>
                              {blurStatus[field] === "analyzing"
                                ? <LoaderCircle className="h-5 w-5 animate-spin" />
                                : blurStatus[field] === "warn"
                                  ? <AlertCircle className="h-5 w-5" />
                                  : <CheckCircle className="h-5 w-5" />
                              }
                            </div>
                          </div>
                        )}

                        {blurStatus[field] === "analyzing" ? (
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
                              />
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#cfdbef] bg-[linear-gradient(180deg,#f7fbff_0%,#eef5ff_100%)] px-4 py-3 shadow-[0_10px_20px_rgba(36,76,184,0.08)]">
                              <p className="min-w-0 truncate text-sm font-semibold text-[#2B4779]" title={documentFiles[field]?.name}>
                                {documentFiles[field]?.name}
                              </p>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openDocPicker(field); }}
                                className="flex-shrink-0 rounded-xl bg-[linear-gradient(135deg,#244CB8_0%,#4F7FF1_100%)] px-3 py-2 text-xs font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_14px_24px_rgba(36,76,184,0.28)]"
                              >
                                Chọn lại
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 flex min-h-[160px] flex-col items-center justify-center px-3 py-4 text-center">
                            <div className="flex items-center justify-center text-[#244CB8] drop-shadow-[0_8px_18px_rgba(36,76,184,0.14)] transition-all duration-300 group-hover:scale-105 group-hover:text-[#173D97]">
                              <ImagePlus className="h-7 w-7" />
                            </div>
                            <p className="mt-4 text-sm font-semibold text-[#204178]">{documentLabels[field]}</p>
                            <p className="mt-1 text-xs leading-6 text-[#6F89B5]">
                              {draggingDocField === field ? "Thả ảnh vào đây" : documentHints[field]}
                            </p>
                          </div>
                        )}
                      </div>
                      {documentErrors[field] && (
                        <p className="mt-1.5 text-xs text-rose-600">{documentErrors[field]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Priority criteria */}
              {(criteriaLoading || criteria.length > 0) && (
                <div className={regCard}>
                  <div className="flex items-start gap-3">
                    <SectionIcon icon={<Award className="h-5 w-5 stroke-[2.2]" />} variant="teal" />
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">Bước 3</span>
                      <h2 className="text-lg font-semibold text-[#1F3152]">Tiêu chí ưu tiên</h2>
                      <p className="mt-0.5 text-sm text-[#5C7094]">Tuỳ chọn — giúp tăng cơ hội được xét duyệt khi quá số chỗ</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    {criteriaLoading ? (
                      <div className="flex items-center gap-2 py-2 text-sm text-[#62789f]">
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải tiêu chí ưu tiên...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {criteria.map((c) => {
                          const isSelected = selectedCriteria.has(c.id);
                          const file = evidenceFiles.get(c.id);
                          return (
                            <div key={c.id} className={`rounded-xl border bg-[#f7fbff] p-3 transition hover:border-[#a8c5ea] hover:bg-white ${isSelected ? "border-[#244cb8]" : "border-[#dce9f7]"}`}>
                              <label className="flex cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    setSelectedCriteria((prev) => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(c.id);
                                      else { next.delete(c.id); setEvidenceFiles((m) => { const n = new Map(m); n.delete(c.id); return n; }); }
                                      return next;
                                    });
                                  }}
                                  className="mt-0.5 h-4 w-4 accent-[#244cb8]"
                                />
                                <div className="min-w-0 flex-1">
                                  <span className="block text-sm font-semibold text-[#1a2d52]">{c.name}</span>
                                  {c.description && <span className="block text-xs text-[#62789f]">{c.description}</span>}
                                  <span className="mt-0.5 block text-xs font-medium text-[#244cb8]">+{c.priority_score} điểm{c.tier !== null ? ` · Bậc ${c.tier}` : ""}</span>
                                </div>
                              </label>
                              {isSelected && (
                                <div className="mt-2.5 pl-7">
                                  <label className="mb-1 block text-xs font-semibold text-[#324B76]">Upload minh chứng (tuỳ chọn)</label>
                                  <div className="flex items-center gap-2">
                                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#cfdcf0] bg-white px-3 py-1.5 text-xs font-semibold text-[#244cb8] hover:border-[#244cb8] hover:bg-[#f0f5ff]">
                                      <Upload className="h-3.5 w-3.5" />
                                      {file ? "Đổi file" : "Chọn file"}
                                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setEvidenceFiles((m) => { const n = new Map(m); n.set(c.id, f); return n; }); }} />
                                    </label>
                                    {file && (
                                      <div className="flex min-w-0 items-center gap-1">
                                        <span className="truncate text-xs text-[#62789f]">{file.name}</span>
                                        <button type="button" onClick={() => setEvidenceFiles((m) => { const n = new Map(m); n.delete(c.id); return n; })} className="text-[#9aaac4] hover:text-rose-500"><X className="h-3.5 w-3.5" /></button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Commitment + submit */}
              <div className={regCard}>
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    id="commitmentConfirm"
                    checked={commitmentConfirm}
                    onChange={(e) => { setCommitmentConfirm(e.target.checked); setFormErrors((p) => ({ ...p, commitment_confirm: "" })); }}
                    className="mt-1 h-5 w-5 flex-shrink-0 cursor-pointer rounded-lg border-2 border-[#b7ccee] bg-white transition-all duration-200 checked:border-[#244CB8] checked:bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] hover:border-[#244CB8] focus:outline-none focus:ring-4 focus:ring-[#244CB8]/14 accent-[#244CB8]"
                  />
                  <label htmlFor="commitmentConfirm" className="flex-1 cursor-pointer">
                    <p className="text-sm font-semibold leading-6 text-[#1F3152]">Cam kết thông tin trung thực <span className="text-red-500">*</span></p>
                    <p className="mt-0.5 text-sm leading-6 text-[#5C7094]">
                      Tôi xác nhận tất cả thông tin khai báo trong hồ sơ này là đúng sự thật. Đơn đăng ký lưu trú sẽ được tự động tạo khi tôi xác nhận nhập học.
                    </p>
                  </label>
                </div>
                {formErrors.commitment_confirm && (
                  <p className="mt-2 text-xs text-rose-600">{formErrors.commitment_confirm}</p>
                )}

                {submitError && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {submitError}
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#DFE8F4] pt-5">
                  <button type="button" onClick={() => { setStep("verify"); setCandidate(null); }} className={secondaryBtn}>
                    Quay lại
                  </button>
                  <button type="button" disabled={submitLoading || periods.length === 0} onClick={() => void handleSubmit()} className={primaryBtn}>
                    {submitLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Gửi hồ sơ đăng ký
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Success ── */}
          {step === "success" && reservation && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="space-y-5"
            >
              <div className="rounded-[22px] border border-emerald-200 bg-[linear-gradient(180deg,#f0fdf8_0%,#e6faf3_100%)] p-8 text-center shadow-[0_14px_30px_rgba(16,185,129,0.10)]">
                <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle className="h-8 w-8" />
                </span>
                <h2 className="mb-2 text-xl font-bold text-[#1a2d52]">Hồ sơ đã được gửi thành công!</h2>
                <p className="mb-4 text-sm text-[#5C7094]">BQL sẽ xem xét và phản hồi sớm nhất có thể.</p>

                <div className="rounded-xl border border-[#cfdcf0] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-4 py-4 text-sm text-left">
                  <p className="mb-2 font-semibold text-[#244cb8]">Bước tiếp theo sau khi nhập học:</p>
                  <ol className="space-y-1 text-xs text-[#3d5a9e]">
                    <li>1. Sau khi có MSSV, bạn sẽ nhận email thông báo xác nhận nhập học.</li>
                    <li>2. Đăng ký tài khoản tại trang <strong>/register</strong> bằng MSSV.</li>
                    <li>3. Đơn đăng ký lưu trú sẽ được tự động tạo — đăng nhập để kiểm tra trạng thái.</li>
                  </ol>
                </div>

                {claimedPriorities.length > 0 && (
                  <div className="mt-4 rounded-xl border border-[#cfdcf0] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-4 py-3 text-sm text-left">
                    <div className="mb-1.5 flex items-center gap-2 font-bold text-[#244cb8]">
                      <Award className="h-4 w-4" />
                      Đã khai báo {claimedPriorities.length} tiêu chí ưu tiên
                    </div>
                    <ul className="space-y-0.5 text-xs text-[#3d5a9e]">
                      {claimedPriorities.map((p) => (
                        <li key={p.id}>• {p.criteria?.name ?? `Tiêu chí #${p.priorityCriteriaId}`}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-[#62789f]">BQL sẽ xác minh minh chứng và cập nhật điểm ưu tiên trước khi xếp hạng.</p>
                  </div>
                )}

                <div className="mt-6 flex justify-center">
                  <button type="button" onClick={resetAll} className={secondaryBtn}>
                    <User className="h-4 w-4" /> Đăng ký hồ sơ khác
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
