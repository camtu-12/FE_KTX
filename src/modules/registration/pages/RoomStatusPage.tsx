import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Award, CheckCircle, ChevronDown, Clock, ExternalLink, FileText, LoaderCircle, RefreshCw, User, Users } from "lucide-react";
import { getLatestRegistrationByEmail } from "../../../api/registrationService";
import { checkEligibility, type EligibilityResult } from "../../../api/registrationApi";
import { getStudentPayments } from "../../../api/paymentApi";
import type { RegistrationRequest } from "../../admin/data/registrationRequests";
import { useAuthStore } from "../../auth/store";
import { formatDate } from "../../../utils/dateFormat";

// ─── Registration detail accordion ───────────────────────────────────────────

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6d7fa6]">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-[#1b3766]">{value || "—"}</p>
    </div>
  );
}

function AccordionSection({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#d8e7f8] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-[#f7faff]"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-[#1a2d52]">
          <Icon className="h-4 w-4 text-[#244cb8]" />
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#6d7fa6] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="border-t border-[#eef3fb] px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function RegistrationDetailSection({ registration }: { registration: RegistrationRequest }) {
  const [open, setOpen] = useState({
    personal: true,
    family: false,
    documents: false,
    criteria: false,
    commitment: false,
  });
  const toggle = (key: keyof typeof open) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const { formData } = registration;

  const criteriaStatusMeta = (status: string) => {
    if (status === "verified") return { label: "Đã xác minh", cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" };
    if (status === "rejected") return { label: "Từ chối", cls: "bg-rose-100 text-rose-700 border border-rose-200" };
    return { label: "Chờ xác minh", cls: "bg-amber-100 text-amber-700 border border-amber-200" };
  };

  return (
    <div className="w-full max-w-3xl space-y-3 pb-6">
      <h2 className="px-1 text-base font-bold text-[#1a2d52]">Thông tin đơn đã nộp</h2>

      {/* Thông tin cá nhân */}
      <AccordionSection title="Thông tin cá nhân" icon={User} isOpen={open.personal} onToggle={() => toggle("personal")}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <InfoField label="MSSV" value={formData.mssv} />
          <InfoField label="Họ và tên" value={formData.fullName} />
          <InfoField label="Ngày sinh" value={formatDate(formData.birthDate)} />
          <InfoField label="Giới tính" value={formData.gender} />
          <InfoField label="Lớp" value={formData.class} />
          <InfoField label="Khoa / Ngành" value={formData.department} />
          <InfoField label="Quốc tịch" value={formData.nationality} />
          <InfoField label="Dân tộc" value={formData.ethnicity} />
          <InfoField label="Tôn giáo" value={formData.religion} />
          <InfoField label="Số điện thoại" value={formData.phone} />
          <InfoField label="Số CCCD / CMND" value={formData.cccd} />
          <InfoField label="Ngày cấp" value={formatDate(formData.cccdIssueDate)} />
          <div className="col-span-2 sm:col-span-3">
            <InfoField label="Nơi cấp" value={formData.cccdIssuePlace} />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <InfoField label="Địa chỉ thường trú" value={formData.address} />
          </div>
        </div>
      </AccordionSection>

      {/* Thông tin gia đình */}
      <AccordionSection title="Thông tin gia đình & liên hệ" icon={Users} isOpen={open.family} onToggle={() => toggle("family")}>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-[#244cb8]">Cha</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <InfoField label="Họ tên" value={formData.father_name} />
              <InfoField label="Số điện thoại" value={formData.father_phone} />
              <InfoField label="Nghề nghiệp" value={formData.father_job} />
            </div>
          </div>
          <div className="border-t border-[#eef3fb] pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-[#244cb8]">Mẹ</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <InfoField label="Họ tên" value={formData.mother_name} />
              <InfoField label="Số điện thoại" value={formData.mother_phone} />
              <InfoField label="Nghề nghiệp" value={formData.mother_job} />
            </div>
          </div>
          <div className="border-t border-[#eef3fb] pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-[#244cb8]">Liên hệ khẩn cấp</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <InfoField label="Họ tên" value={formData.relationName} />
              <InfoField label="Số điện thoại" value={formData.relationPhone} />
              <InfoField label="Quan hệ" value={formData.relationship} />
              <div className="col-span-2 sm:col-span-3">
                <InfoField label="Địa chỉ liên hệ gia đình" value={formData.familyContactAddress} />
              </div>
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* Tài liệu đính kèm */}
      <AccordionSection title="Tài liệu đính kèm" icon={FileText} isOpen={open.documents} onToggle={() => toggle("documents")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Ảnh chân dung", url: registration.avatarUrl },
            { label: "CCCD mặt trước", url: registration.cccdFrontUrl },
            { label: "CCCD mặt sau", url: registration.cccdBackUrl },
          ].map(({ label, url }) => (
            <div key={label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#6d7fa6]">{label}</p>
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className="group relative block">
                  <img
                    src={url}
                    alt={label}
                    className="h-36 w-full rounded-xl border border-[#d8e7f8] object-cover transition group-hover:opacity-80"
                  />
                  <span className="absolute inset-0 flex items-center justify-center rounded-xl opacity-0 transition group-hover:opacity-100">
                    <span className="flex items-center gap-1 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold text-white">
                      <ExternalLink className="h-3.5 w-3.5" /> Xem ảnh
                    </span>
                  </span>
                </a>
              ) : (
                <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-[#d8e7f8] bg-[#f7faff] text-xs text-[#9aacca]">
                  Chưa có ảnh
                </div>
              )}
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* Tiêu chí ưu tiên */}
      <AccordionSection title="Tiêu chí ưu tiên" icon={Award} isOpen={open.criteria} onToggle={() => toggle("criteria")}>
        {registration.priority_criteria && registration.priority_criteria.length > 0 ? (
          <div className="space-y-3">
            {registration.priority_criteria.map((c) => {
              const meta = criteriaStatusMeta(c.status);
              return (
                <div key={c.id} className="rounded-xl border border-[#eef3fb] bg-[#f7faff] px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#1b3766]">{c.name}</p>
                      <p className="mt-0.5 text-xs text-[#6d7fa6]">Mã: {c.code}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
                  </div>
                  {c.evidence_urls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.evidence_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#c8d9f0] bg-white px-2.5 py-1 text-xs font-medium text-[#244cb8] transition hover:bg-[#eef3fb]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Minh chứng {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[#9aacca]">Không có tiêu chí ưu tiên.</p>
        )}
      </AccordionSection>

      {/* Cam kết & thời gian */}
      <AccordionSection title="Cam kết & thời gian đăng ký" icon={CheckCircle} isOpen={open.commitment} onToggle={() => toggle("commitment")}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <InfoField label="Ngày bắt đầu ở" value={formatDate(formData.dormStartDate)} />
            <InfoField label="Ngày kết thúc ở" value={formatDate(formData.dormEndDate)} />
            <InfoField label="Ngày nộp đơn" value={formatDate(registration.submittedAt)} />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#d8e7f8] bg-[#f7faff] px-4 py-3">
            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${registration.commitmentConfirmed ? "border-emerald-500 bg-emerald-500" : "border-[#9aacca] bg-white"}`}>
              {registration.commitmentConfirmed && (
                <svg viewBox="0 0 12 9" className="h-3 w-3 fill-white">
                  <path d="M1 4.5L4.5 8L11 1" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p className="text-sm font-medium text-[#1b3766]">
              Tôi xác nhận đã đọc và đồng ý với các điều khoản và quy định của ký túc xá.
            </p>
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}

// ─── Status timeline ──────────────────────────────────────────────────────────

type TimelineState = "done" | "current" | "pending" | "rejected";

function StatusTimeline({ status }: { status: RegistrationRequest["status"] }) {
  const steps: Array<{ label: string; state: TimelineState }> = [
    { label: "Đã gửi đơn", state: "done" },
    { label: "Đang xét duyệt", state: status === "submitted" ? "current" : "done" },
    {
      label: status === "approved" ? "Được duyệt" : status === "rejected" ? "Từ chối" : "Chờ kết quả",
      state: status === "approved" ? "done" : status === "rejected" ? "rejected" : "pending",
    },
  ];

  const getStepClass = (state: TimelineState) => {
    if (state === "done") return "border-emerald-200 bg-emerald-100 text-emerald-700";
    if (state === "current") return "border-amber-200 bg-amber-100 text-amber-700";
    if (state === "rejected") return "border-red-200 bg-red-100 text-red-700";
    return "border-[#d8e3f3] bg-white text-[#7c8fad]";
  };

  const getLineClass = (nextState: TimelineState) => {
    if (nextState === "done") return "bg-emerald-300";
    if (nextState === "current") return "bg-amber-300";
    if (nextState === "rejected") return "bg-red-300";
    return "bg-[#d8e3f3]";
  };

  return (
    <div className="mx-auto mt-5 w-full max-w-2xl px-1 sm:px-6">
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-2 sm:gap-3">
        {steps.map((step, index) => (
          <Fragment key={step.label}>
            <div className="flex min-w-0 flex-col items-center text-center">
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-base shadow-[0_8px_18px_rgba(15,23,42,0.08)] ${getStepClass(step.state)}`}>
                {step.state === "rejected" ? (
                  <AlertCircle className="h-5 w-5" />
                ) : step.state === "done" ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
              </span>
              <span className="mt-2 text-xs font-semibold text-[#1F3152] sm:text-sm">{step.label}</span>
            </div>
            {index < steps.length - 1 ? (
              <span className={`mt-[17px] h-0.5 w-16 rounded-full sm:w-32 ${getLineClass(steps[index + 1].state)}`} />
            ) : null}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export default function RoomStatusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefetched = (location.state as { registration?: RegistrationRequest; eligibility?: EligibilityResult } | null);
  const studentEmail = useAuthStore((state) => state.user?.email ?? "");
  const [registration, setRegistration] = useState<RegistrationRequest | null>(prefetched?.registration ?? null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(prefetched?.eligibility ?? null);
  const [loading, setLoading] = useState(!prefetched?.registration);
  const [error, setError] = useState("");
  const [firstBillDueDate, setFirstBillDueDate] = useState<string | null>(null);
  const [firstBillIsOverdue, setFirstBillIsOverdue] = useState(false);
  const skipFirstFetch = useRef(!!prefetched?.registration);

  const loadRegistration = useCallback(
    async (isMounted: () => boolean = () => true) => {
      if (!studentEmail) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");
        // Gộp luôn việc lấy hóa đơn vào chung 1 lượt tải ban đầu (dù chưa biết chắc có
        // cần dùng hay không) — tránh tình trạng trang hiện xong rồi mới "nhảy" thêm dòng
        // cảnh báo quá hạn sau một nhịp tải riêng lẻ.
        const [data, eligRes, paymentsRes] = await Promise.all([
          getLatestRegistrationByEmail(studentEmail),
          checkEligibility(studentEmail).catch(() => ({ eligible: false } as EligibilityResult)),
          getStudentPayments().catch(() => null),
        ]);

        if (!isMounted()) return;

        if (!data) {
          navigate("/student/registration", { replace: true });
          return;
        }

        // Các trường hợp không được xem trạng thái đơn tại đây (blacklist/buộc thôi ở/đã ở
        // chính thức): điều hướng sang trang "Đăng ký nội trú" — trang đó tự kiểm tra lại
        // eligibility và hiển thị đúng lý do + nút điều hướng phù hợp, thay vì im lặng đưa
        // thẳng sang "Phòng của tôi" như trước (gây khó hiểu, không giải thích gì).
        if (
          data.blacklist ||
          data.occupancy_status === "forced_checkout" ||
          eligRes.reason_code === "blacklisted" ||
          (data.status === "approved" && data.occupancy_status === "ACTIVE")
        ) {
          navigate("/student/registration", { replace: true });
          return;
        }

        setRegistration(data);
        setEligibility(eligRes);

        if (data.occupancy_status === "PENDING_PAYMENT" && paymentsRes) {
          const unpaidRoomFeeBills = paymentsRes.items
            .filter((item) => item.source === "room_fee" && item.status !== "paid")
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
          setFirstBillDueDate(unpaidRoomFeeBills[0]?.dueDate ?? null);
          setFirstBillIsOverdue(unpaidRoomFeeBills[0]?.status === "overdue");
        }
      } catch (err) {
        if (!isMounted()) return;
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải trạng thái đăng ký. Vui lòng thử lại sau."
        );
      } finally {
        if (isMounted()) {
          setLoading(false);
        }
      }
    },
    [navigate, studentEmail],
  );

  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }

    let mounted = true;
    void loadRegistration(() => mounted);
    return () => { mounted = false; };
  }, [loadRegistration]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-[#b7ccef] bg-white/80 px-6 py-4 text-[#1F3152] shadow-[0_12px_24px_rgba(36,76,184,0.12)]">
          <LoaderCircle className="h-5 w-5 animate-spin text-[#244CB8]" />
          <span>Đang tải trạng thái đăng ký...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/95 p-5 text-red-700 shadow-[0_12px_24px_rgba(239,68,68,0.16)]">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!registration) {
    return null;
  }

  const occupancyStatus = registration.occupancy_status ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Trạng thái đăng ký</h1>
        <p className="mt-1 text-sm text-[#62789f]">
          Theo dõi tình trạng đơn đăng ký nội trú của bạn.
        </p>
      </div>
      <div className="flex flex-1 flex-col items-center gap-4 px-0 pb-8 pt-3 sm:pb-12 sm:pt-4">
        {registration.status === "rejected" ? (
        <div className="w-full max-w-3xl rounded-2xl border border-red-200 bg-red-50/95 p-6 text-center shadow-[0_12px_24px_rgba(239,68,68,0.16)]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
            <AlertCircle className="h-3.5 w-3.5" />
            Bị từ chối
          </span>
          <StatusTimeline status={registration.status} />
          <p className="mt-3 font-semibold text-red-900">Đơn đăng ký bị từ chối</p>
          <p className="mt-1.5 text-sm text-red-700">
            Lý do: {registration.rejectionReason || "Chưa có lý do cụ thể."}
          </p>
          {eligibility?.eligible ? (
            <button
              type="button"
              onClick={() => navigate("/student/registration?resubmit=true")}
              className="auth-btn-gloss mx-auto mt-4 rounded-xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(204,60,79,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
            >
              <span className="auth-btn-gloss__content">Gửi lại đơn</span>
            </button>
          ) : (
            <p className="mt-3 text-sm text-red-500">
              Hiện chưa có đợt đăng ký nào đang mở.
            </p>
          )}
        </div>
      ) : registration.status === "approved" && occupancyStatus === "ROOM_CONFIRMED" ? (
        <div className="w-full max-w-3xl rounded-2xl border border-emerald-200 bg-emerald-50/95 p-6 text-center shadow-[0_12px_24px_rgba(16,185,129,0.14)]">
          <StatusTimeline status={registration.status} />
          <p className="mt-3 font-semibold text-emerald-900">Bạn đã được phân phòng!</p>
          <p className="mt-1.5 text-sm text-emerald-700">
            Vui lòng vào chọn giường để hoàn tất thủ tục lưu trú.
          </p>
          {registration.bed_selection_deadline ? (
            <p className="mt-1 text-sm font-semibold text-emerald-800">
              Hạn chọn giường: 17:00 ngày {formatDate(registration.bed_selection_deadline)}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => navigate("/student/room")}
            className="auth-btn-gloss mx-auto mt-4 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#31b7d4_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(36,76,184,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
          >
            <span className="auth-btn-gloss__content">Chọn giường</span>
          </button>
        </div>
      ) : registration.status === "approved" && occupancyStatus === "PENDING_PAYMENT" ? (
        <div className="w-full max-w-3xl rounded-2xl border border-amber-200 bg-amber-50/95 p-6 text-center shadow-[0_12px_24px_rgba(180,120,0,0.12)]">
          <StatusTimeline status={registration.status} />
          <p className="mt-3 font-semibold text-amber-900">Bạn đã chọn giường thành công!</p>
          <p className="mt-1.5 text-sm text-amber-700">
            Vui lòng thanh toán hóa đơn tháng đầu để hoàn tất lưu trú.
          </p>
          {firstBillDueDate ? (
            <p className="mt-1 text-sm font-semibold text-amber-800">
              Hạn thanh toán: {formatDate(firstBillDueDate)}
            </p>
          ) : null}
          {firstBillIsOverdue ? (
            <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              ⚠ Đã quá hạn thanh toán — vui lòng thanh toán sớm để tránh bị nhắc nợ/xử lý theo quy định.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => navigate("/student/payment")}
            className="auth-btn-gloss mx-auto mt-4 rounded-xl bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(245,158,11,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
          >
            <span className="auth-btn-gloss__content">Thanh toán ngay</span>
          </button>
        </div>
      ) : registration.status === "approved" ? (
        <div className="w-full max-w-3xl rounded-2xl border border-blue-200 bg-blue-50/95 p-6 text-center shadow-[0_12px_24px_rgba(36,76,184,0.10)]">
          <StatusTimeline status={registration.status} />
          <p className="mt-3 font-semibold text-blue-900">Hồ sơ đã được duyệt!</p>
          <p className="mt-1.5 text-sm text-blue-700">
            Vui lòng chờ ban quản lý phân phòng. Bạn sẽ được thông báo khi có phòng.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-3xl rounded-2xl border border-amber-200 bg-[linear-gradient(180deg,#fffdf3_0%,#fff7db_100%)] p-6 text-center shadow-[0_14px_28px_rgba(180,120,0,0.14)]">
          <StatusTimeline status={registration.status} />
          <p className="mt-3 font-semibold text-[#7a4d00]">Hồ sơ đang chờ xét duyệt</p>
          <p className="mt-1.5 text-sm text-[#8a6a2a]">
            Dự kiến xử lý trong 3–5 ngày làm việc.
          </p>
          <button
            type="button"
            onClick={() => void loadRegistration()}
            className="auth-btn-gloss mx-auto mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f7b733_0%,#d89412_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(216,148,18,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="auth-btn-gloss__content">Kiểm tra lại</span>
          </button>
        </div>
        )}

        {(registration.status === "submitted" || registration.status === "approved") && (
          <RegistrationDetailSection registration={registration} />
        )}
      </div>
    </motion.div>
  );
}
