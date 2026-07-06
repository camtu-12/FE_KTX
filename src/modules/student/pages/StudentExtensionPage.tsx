import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  DoorOpen,
  Eye,
  FileText,
  Info,
  RefreshCw,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  checkExtensionEligibility,
  getActiveExtensionPeriod,
  getMyExtensions,
  submitExtension,
  type ActiveExtensionPeriod,
  type ExtensionEligibility,
  type OccupancyExtension,
} from "../../../api/extensionApi";
import type { MyRoom } from "../../../mocks/myRoom";
import { formatDate } from "../../../utils/dateFormat";
import { useAuthStore } from "../../auth/store";
import { getMyOccupancyFromBackend } from "../services/occupancyService";

type ToastState = { type: "success" | "error"; message: string };

type ConditionRow = {
  label: string;
  passed: boolean;
  warn?: boolean; // vàng — đủ điều kiện nhưng cần admin xét duyệt
  detail?: string;
  action?: ReactNode;
};

const STATUS_LABELS: Record<OccupancyExtension["status"], string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

const STATUS_COLORS: Record<OccupancyExtension["status"], string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function StudentExtensionPage() {
  const email = useAuthStore((state) => state.user?.email ?? "");

  const [activePeriod, setActivePeriod] = useState<ActiveExtensionPeriod | null>(null);
  const [loadingPeriod, setLoadingPeriod] = useState(true);
  const [occupancy, setOccupancy] = useState<MyRoom | null>(null);
  const [loadingOccupancy, setLoadingOccupancy] = useState(true);
  const [extensions, setExtensions] = useState<OccupancyExtension[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [eligibility, setEligibility] = useState<ExtensionEligibility | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(true);

  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isEligibilityModalOpen, setIsEligibilityModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<OccupancyExtension | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const loadActivePeriod = useCallback(async () => {
    setLoadingPeriod(true);
    try {
      const period = await getActiveExtensionPeriod();
      setActivePeriod(period);
    } finally {
      setLoadingPeriod(false);
    }
  }, []);

  const loadOccupancy = useCallback(async () => {
    if (!email) return;
    setLoadingOccupancy(true);
    try {
      const data = await getMyOccupancyFromBackend(email);
      setOccupancy(data);
    } finally {
      setLoadingOccupancy(false);
    }
  }, [email]);

  const loadHistory = useCallback(async () => {
    if (!email) return;
    setLoadingHistory(true);
    try {
      const data = await getMyExtensions();
      setExtensions(data);
    } finally {
      setLoadingHistory(false);
    }
  }, [email]);

  const loadEligibility = useCallback(async () => {
    if (!email) return;
    setLoadingEligibility(true);
    try {
      const data = await checkExtensionEligibility();
      setEligibility(data);
    } catch {
      setEligibility(null);
    } finally {
      setLoadingEligibility(false);
    }
  }, [email]);

  useEffect(() => {
    loadActivePeriod();
    loadOccupancy();
    loadHistory();
    loadEligibility();
  }, [loadActivePeriod, loadOccupancy, loadHistory, loadEligibility]);

  const hasPendingRequest = extensions.some((e) => e.status === "pending");
  const hasApprovedRequest = extensions.some((e) => e.status === "approved");
  const submittedExtension =
    extensions.find((e) => e.status === "pending") ??
    extensions.find((e) => e.status === "approved") ??
    null;

  const canSubmit =
    !hasPendingRequest &&
    !hasApprovedRequest &&
    !!occupancy &&
    occupancy.status === "ACTIVE" &&
    !!activePeriod &&
    !!eligibility?.eligible;

  const conditionRows = useMemo(() => buildConditionRows(eligibility), [eligibility]);
  const failedCount = conditionRows.filter((row) => !row.passed && !row.warn).length;
  const warnCount   = conditionRows.filter((row) => !!row.warn).length;
  const passedCount = conditionRows.filter((row) => row.passed).length;

  const disabledReason = (() => {
    if (loadingOccupancy || loadingPeriod || loadingEligibility) return "Đang kiểm tra dữ liệu...";
    if (hasPendingRequest) return "Bạn đã có yêu cầu đang chờ duyệt.";
    if (hasApprovedRequest) return "Yêu cầu gia hạn của bạn đã được duyệt.";
    if (!occupancy || occupancy.status !== "ACTIVE") return "Bạn không có lưu trú đang hoạt động.";
    if (!activePeriod) return "Hiện không có đợt gia hạn đang mở.";
    if (!eligibility?.eligible) return "Bạn chưa đủ điều kiện gia hạn.";
    return "";
  })();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 10) {
      showToast("error", "Lý do phải có ít nhất 10 ký tự.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitExtension({ reason: reason.trim() });
      if (result.status === "approved") {
        showToast("success", "Gia hạn tự động thành công. Ngày kết thúc lưu trú đã được cập nhật.");
      } else {
        showToast("success", "Đã gửi yêu cầu gia hạn. Đang chờ admin xét duyệt.");
      }
      setReason("");
      await Promise.all([loadHistory(), loadEligibility(), loadOccupancy()]);
      setIsRequestModalOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast("error", msg ?? "Gửi yêu cầu thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-3 sm:p-4">
      {toast &&
        createPortal(
          <div
            className={`fixed right-5 top-5 z-[9999] rounded-xl px-5 py-3 text-sm font-semibold shadow-lg ${
              toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            }`}
          >
            {toast.message}
          </div>,
          document.body,
        )}

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="space-y-4"
      >
        <ExtensionPeriodBanner loading={loadingPeriod} period={activePeriod} />

        <QuickActionGrid
          hasOpenPeriod={!!activePeriod}
          loadingEligibility={loadingEligibility}
          passedCount={passedCount}
          totalCount={conditionRows.length}
          historyCount={extensions.length}
          failedCount={failedCount}
          warnCount={warnCount}
          onOpenEligibility={() => setIsEligibilityModalOpen(true)}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
        />

        {(!!activePeriod || !!submittedExtension) && (
          <ExtensionSubmitCard
            canSubmit={canSubmit}
            disabledReason={disabledReason}
            submittedExtension={submittedExtension}
            onOpenRequest={() => setIsRequestModalOpen(true)}
          />
        )}

      </motion.section>

      {createPortal(
        <AnimatePresence>
          {isEligibilityModalOpen && (
            <EligibilityModal
              rows={conditionRows}
              eligible={eligibility?.eligible ?? false}
              passedCount={passedCount}
              totalCount={conditionRows.length}
              onClose={() => setIsEligibilityModalOpen(false)}
            />
          )}

          {isRequestModalOpen && (
            <RequestFormModal
              reason={reason}
              setReason={setReason}
              canSubmit={canSubmit}
              submitting={submitting}
              disabledReason={disabledReason}
              branch={eligibility?.branch ?? null}
              onSubmit={handleSubmit}
              onClose={() => setIsRequestModalOpen(false)}
            />
          )}

          {isHistoryModalOpen && (
            <HistoryModal
              loading={loadingHistory}
              extensions={extensions}
              onSelect={setSelectedExtension}
              onClose={() => setIsHistoryModalOpen(false)}
            />
          )}

          {selectedExtension && (
            <ExtensionDetailModal
              extension={selectedExtension}
              onClose={() => setSelectedExtension(null)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

function ExtensionPeriodBanner({
  loading,
  period,
}: {
  loading: boolean;
  period: ActiveExtensionPeriod | null;
}) {
  const eligible = false;
  const passedCount = 0;
  const totalCount = 0;
  const progress = 0;

  if (loading) {
    return (
      <section className="rounded-[20px] border border-[#c9d9f2] bg-white/75 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold text-[#7c8fb5]">Đang tải đợt gia hạn...</p>
      </section>
    );
  }

  if (!period) {
    return (
      <section className="flex items-center gap-3 rounded-[20px] border border-amber-200 bg-amber-50 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
          <Clock3 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Đợt gia hạn</p>
          <h1 className="mt-1 text-xl font-bold text-[#1a2d52]">Hiện không có đợt gia hạn đang mở</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[20px] border border-[#b9cff2] bg-[linear-gradient(135deg,#f8fbff_0%,#eaf3ff_62%,#dceaff_100%)] p-4 shadow-[0_12px_26px_rgba(36,76,184,0.10)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-[#244cb8] shadow-[0_8px_16px_rgba(36,76,184,0.10)]">
            <CalendarRange className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5570a0]">Đợt gia hạn đang mở</p>
            <h1 className="mt-0.5 truncate text-xl font-bold text-[#173a78]">{period.name}</h1>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[340px]">
          <BannerMetric label="Hạn nộp đơn" value={period.end_date ? formatDate(period.end_date) : "Không giới hạn"} />
          <BannerMetric
            label="Gia hạn đến"
            value={period.extension_until_date ? formatDate(period.extension_until_date) : "Chưa thiết lập"}
            accent
          />
        </div>
      </div>
      {false ? (
        <div className="mt-4 rounded-2xl border border-[#e1e9f6] bg-[#f8fbff] p-4">
          <div className="mb-2 flex items-center justify-between gap-4 text-sm font-semibold text-[#667ca8]">
            <span>{passedCount} / {totalCount} điều kiện đạt</span>
            <span className={eligible ? "text-emerald-700" : "text-[#244cb8]"}>{progress}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[#e7eef9]">
            <div
              className={`h-full rounded-full ${eligible ? "bg-emerald-500" : "bg-[#244cb8]"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function CurrentStayStats({ loading, occupancy }: { loading: boolean; occupancy: MyRoom | null }) {
  return (
    <section className="rounded-[18px] border border-[#d6e2f1] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.055)]">
      <SectionTitle icon={<Info className="h-4 w-4" />} title="Thông tin lưu trú hiện tại" />
      {loading ? (
        <div className="mt-3 rounded-xl border border-[#d6e2f1] bg-[#f8fbff] p-3 text-sm font-semibold text-[#7c8fb5]">
          Đang tải thông tin lưu trú...
        </div>
      ) : !occupancy ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
          Bạn hiện không có lưu trú đang hoạt động.
        </div>
      ) : (
        <div className="mt-3 grid gap-0 overflow-hidden rounded-xl border border-[#e1e9f6] sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<DoorOpen className="h-5 w-5" />} label="Phòng" value={occupancy.roomCode || "—"} />
          <StatCard icon={<BedDouble className="h-5 w-5" />} label="Giường" value={occupancy.bedNumber ? `Giường ${occupancy.bedNumber}` : "—"} />
          <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Ngày bắt đầu" value={formatDate(occupancy.startDate)} />
          <StatCard icon={<CalendarRange className="h-5 w-5" />} label="Ngày kết thúc hiện tại" value={formatDate(occupancy.endDate)} accent />
        </div>
      )}
    </section>
  );
}

export function EligibilitySummaryCard({
  loading,
  eligibility,
  failedCount,
  passedCount,
  totalCount,
  onOpenDetails,
}: {
  loading: boolean;
  eligibility: ExtensionEligibility | null;
  failedCount: number;
  passedCount: number;
  totalCount: number;
  onOpenDetails: () => void;
}) {
  const eligible = !!eligibility?.eligible;
  const progress = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  return (
    <section className="rounded-[18px] border border-[#d6e2f1] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.055)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
              eligible ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : eligible ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">Trạng thái điều kiện</p>
            <h2 className="mt-0.5 text-lg font-bold text-[#1a2d52]">
              {loading ? "Đang kiểm tra..." : eligible ? "Đủ điều kiện gia hạn" : "Chưa đủ điều kiện gia hạn"}
            </h2>
            {!loading && eligibility ? (
              <p className="mt-1 text-sm text-[#667ca8]">
                {eligible
                  ? eligibility.branch === "B"
                    ? "Yêu cầu sẽ được admin xem xét do có điều kiện cần duyệt."
                    : "Có thể gửi yêu cầu, hệ thống sẽ xử lý tự động."
                  : `Có ${failedCount} điều kiện chưa đạt.`}
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenDetails}
          disabled={loading || !eligibility}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#c8d8ef] bg-[#f8fbff] px-3 text-xs font-semibold text-[#244cb8] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Eye className="h-3.5 w-3.5" />
          Xem chi tiết
        </button>
      </div>
      {!loading && eligibility ? (
        <div className="mt-3 rounded-xl border border-[#e1e9f6] bg-[#f8fbff] p-3">
          <div className="mb-1.5 flex items-center justify-between gap-4 text-xs font-semibold text-[#667ca8]">
            <span>{passedCount} / {totalCount} điều kiện đạt</span>
            <span className={eligible ? "text-emerald-700" : "text-[#244cb8]"}>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e7eef9]">
            <div
              className={`h-full rounded-full ${eligible ? "bg-emerald-500" : "bg-[#244cb8]"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function QuickActionGrid({
  hasOpenPeriod,
  loadingEligibility,
  passedCount,
  totalCount,
  historyCount,
  failedCount,
  warnCount,
  onOpenEligibility,
  onOpenHistory,
}: {
  hasOpenPeriod: boolean;
  loadingEligibility: boolean;
  passedCount: number;
  totalCount: number;
  historyCount: number;
  failedCount: number;
  warnCount: number;
  onOpenEligibility: () => void;
  onOpenHistory: () => void;
}) {
  const eligibilityTone: "success" | "warning" | "primary" =
    failedCount === 0 && warnCount === 0 && totalCount > 0
      ? "success"
      : failedCount === 0 && warnCount > 0
      ? "warning"
      : "primary";

  const subtitle = loadingEligibility
    ? "Đang kiểm tra..."
    : warnCount > 0 && failedCount === 0
    ? `${passedCount}/${totalCount} đạt, ${warnCount} cần xét duyệt`
    : `${passedCount}/${totalCount} điều kiện đạt`;

  return (
    <section className={`grid gap-3 ${hasOpenPeriod ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
      {hasOpenPeriod && (
        <QuickActionCard
          icon={<ClipboardList className="h-5 w-5" />}
          title="Điều kiện gia hạn"
          subtitle={subtitle}
          tone={eligibilityTone}
          onClick={onOpenEligibility}
          disabled={loadingEligibility || totalCount === 0}
        />
      )}
      <QuickActionCard
        icon={<Clock3 className="h-5 w-5" />}
        title="Lịch sử yêu cầu"
        subtitle={`${historyCount} yêu cầu`}
        tone="primary"
        onClick={onOpenHistory}
      />
    </section>
  );
}

function QuickActionCard({
  icon,
  title,
  subtitle,
  tone,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  tone: "primary" | "success" | "warning";
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-[#c8d8ef] bg-[#f8fbff] text-[#244cb8]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[82px] items-center gap-3 rounded-[18px] border border-[#d6e2f1] bg-white p-4 text-left shadow-[0_10px_22px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:border-[#abc2e8] hover:bg-[#f8fbff] disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${toneClass}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[#1a2d52]">{title}</span>
        <span className="mt-1 block text-xs font-semibold text-[#667ca8]">{subtitle}</span>
      </span>
    </button>
  );
}

export function EligibilityStatusCard({
  loading,
  eligibility,
  passedCount,
  totalCount,
  onOpenDetails,
}: {
  loading: boolean;
  eligibility: ExtensionEligibility | null;
  passedCount: number;
  totalCount: number;
  onOpenDetails: () => void;
}) {
  const eligible = !!eligibility?.eligible;

  return (
    <section className="rounded-[18px] border border-[#d6e2f1] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.055)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
              eligible ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : eligible ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Trạng thái điều kiện</p>
            <h2 className="mt-0.5 text-lg font-bold text-[#1a2d52]">
              {loading ? "Đang kiểm tra..." : eligible ? "Đủ điều kiện" : "Chưa đủ điều kiện"}
            </h2>
            {!loading && eligibility ? (
              <p className="mt-0.5 text-sm font-semibold text-[#667ca8]">
                {passedCount}/{totalCount} điều kiện đạt
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenDetails}
          disabled={loading || !eligibility}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#c8d8ef] bg-[#f8fbff] px-3 text-xs font-bold text-[#244cb8] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Eye className="h-3.5 w-3.5" />
          Xem chi tiết
        </button>
      </div>
    </section>
  );
}

function ExtensionSubmitCard({
  canSubmit,
  disabledReason,
  historyCount = 0,
  hasPendingRequest = false,
  submittedExtension,
  onOpenRequest,
  onOpenHistory = () => {},
}: {
  canSubmit: boolean;
  disabledReason: string;
  historyCount?: number;
  hasPendingRequest?: boolean;
  submittedExtension: OccupancyExtension | null;
  onOpenRequest: () => void;
  onOpenHistory?: () => void;
}) {
  if (submittedExtension) {
    return (
      <section className="rounded-[18px] border border-[#d6e2f1] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.055)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">Bạn đã gửi yêu cầu gia hạn</p>
            <h2 className="mt-1 text-xl font-bold text-[#1a2d52]">{submittedExtension.occupancy_period?.name ?? "Yêu cầu gia hạn"}</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[300px]">
            <DetailTile label="Trạng thái" value={STATUS_LABELS[submittedExtension.status]} />
            <DetailTile label="Ngày gửi" value={formatDate(submittedExtension.requested_at)} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`rounded-[18px] border p-4 text-center shadow-[0_10px_22px_rgba(15,23,42,0.055)] ${canSubmit ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <h2 className={`text-lg font-bold ${canSubmit ? "text-emerald-800" : "text-amber-800"}`}>
        {canSubmit ? "Bạn đủ điều kiện gia hạn" : "Bạn chưa đủ điều kiện"}
      </h2>
      <p className={`mx-auto mt-2 max-w-2xl text-sm font-semibold ${canSubmit ? "text-emerald-700" : "text-amber-700"}`}>
        {canSubmit ? "Bạn có thể gửi yêu cầu gia hạn lưu trú trong đợt đang mở." : disabledReason || "Hoàn thành các điều kiện trước khi gửi yêu cầu."}
      </p>
      <button
        type="button"
        onClick={onOpenRequest}
        disabled={!canSubmit}
        className="mt-4 inline-flex h-10 min-w-[220px] items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 text-xs font-bold uppercase tracking-[0.04em] text-white shadow-[0_12px_24px_rgba(36,76,184,0.22)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send className="h-3.5 w-3.5" />
        Gửi yêu cầu gia hạn
      </button>
    </section>
  );

  return (
    <section className="rounded-[18px] border border-[#d6e2f1] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.055)]">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">Thao tác nhanh</p>
        <h2 className="mt-1 text-xl font-bold text-[#1a2d52]">Gia hạn lưu trú</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <button
          type="button"
          onClick={onOpenRequest}
          className="group flex min-h-[116px] items-center justify-between gap-4 rounded-[20px] border border-[#c8d8ef] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-4 text-left shadow-[0_12px_26px_rgba(36,76,184,0.08)] transition hover:-translate-y-0.5 hover:border-[#9eb9e6] hover:bg-white"
        >
          <span className="flex min-w-0 items-center gap-4">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-[#244cb8] shadow-sm">
              <Send className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-bold text-[#1a2d52]">Tạo yêu cầu gia hạn</span>
              <span className="mt-1 block text-sm text-[#667ca8]">
                {hasPendingRequest ? "Bạn đang có yêu cầu chờ duyệt." : canSubmit ? "Mở form gửi lý do gia hạn." : disabledReason}
              </span>
            </span>
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              canSubmit ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {canSubmit ? "Có thể gửi" : "Chưa thể gửi"}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenHistory}
          className="group flex min-h-[116px] items-center justify-between gap-4 rounded-[20px] border border-[#c8d8ef] bg-white p-4 text-left shadow-[0_12px_26px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-[#9eb9e6] hover:bg-[#f8fbff]"
        >
          <span className="flex min-w-0 items-center gap-4">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#244cb8] shadow-sm">
              <FileText className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-bold text-[#1a2d52]">Lịch sử yêu cầu</span>
              <span className="mt-1 block text-sm text-[#667ca8]">Xem các lần gia hạn đã gửi.</span>
            </span>
          </span>
          <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-bold text-[#5570a0]">{historyCount} yêu cầu</span>
        </button>
      </div>
    </section>
  );
}

function RequestFormCard({
  reason,
  setReason,
  canSubmit,
  submitting,
  disabledReason,
  branch,
  onSubmit,
}: {
  reason: string;
  setReason: (value: string) => void;
  canSubmit: boolean;
  submitting: boolean;
  disabledReason: string;
  branch: ExtensionEligibility["branch"];
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <section className="rounded-[24px] border border-[#d6e2f1] bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <SectionTitle icon={<Send className="h-4 w-4" />} title="Gửi yêu cầu gia hạn" compact />
        {!canSubmit && disabledReason ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700" title={disabledReason}>
            Chưa thể gửi
          </span>
        ) : null}
      </div>

      {!canSubmit && disabledReason ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          {disabledReason}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Lý do gia hạn</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            maxLength={1000}
            disabled={!canSubmit || submitting}
            placeholder={
              branch === "B"
                ? "Mô tả lý do gia hạn. Yêu cầu sẽ được admin xét duyệt..."
                : "Mô tả lý do bạn cần gia hạn lưu trú..."
            }
            className="mt-2 min-h-[132px] w-full resize-none rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-4 py-3 text-sm text-[#1f3152] outline-none transition placeholder:text-[#8ea1c0] focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={`text-xs ${reason.length > 0 && reason.length < 10 ? "text-rose-500" : "text-[#7c8fb5]"}`}>
            {reason.length}/1000 ký tự, tối thiểu 10
          </p>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.22)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            title={!canSubmit ? disabledReason || "Bạn chưa đủ điều kiện gia hạn." : undefined}
          >
            {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
        </div>
      </form>
    </section>
  );
}

function RequestFormModal({
  reason,
  setReason,
  canSubmit,
  submitting,
  disabledReason,
  branch,
  onSubmit,
  onClose,
}: {
  reason: string;
  setReason: (value: string) => void;
  canSubmit: boolean;
  submitting: boolean;
  disabledReason: string;
  branch: ExtensionEligibility["branch"];
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell onClose={onClose} maxWidth="max-w-[700px]">
      <div className="flex items-start justify-between gap-4 border-b border-[#dbe6f5] px-6 py-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d90b5]">Tạo yêu cầu</p>
          <h3 className="mt-1 text-2xl font-bold text-[#1a2d52]">Gửi yêu cầu gia hạn</h3>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      <div className="px-6 py-5">
        <RequestFormCard
          reason={reason}
          setReason={setReason}
          canSubmit={canSubmit}
          submitting={submitting}
          disabledReason={disabledReason}
          branch={branch}
          onSubmit={onSubmit}
        />
      </div>
    </ModalShell>
  );
}

function HistoryTable({
  loading,
  extensions,
  onSelect,
}: {
  loading: boolean;
  extensions: OccupancyExtension[];
  onSelect: (extension: OccupancyExtension) => void;
}) {
  return (
    <section className="rounded-[24px] border border-[#d6e2f1] bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle icon={<FileText className="h-4 w-4" />} title="Lịch sử yêu cầu" compact />
        <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-bold text-[#5570a0]">{extensions.length} yêu cầu</span>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm font-semibold text-[#7c8fb5]">Đang tải lịch sử...</p>
      ) : extensions.length === 0 ? (
        <p className="py-6 text-center text-sm font-semibold text-[#7c8fb5]">Chưa có yêu cầu gia hạn nào.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#e1e9f6]">
          <table className="w-full min-w-[680px] table-fixed border-separate border-spacing-0">
            <thead>
              <tr className="bg-[#f5f9ff] text-left">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Đợt gia hạn</th>
                <th className="w-[150px] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Ngày gửi</th>
                <th className="w-[140px] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Trạng thái</th>
                <th className="w-[110px] px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {extensions.map((ext) => (
                <tr key={ext.id} className="transition hover:bg-[#f8fbff]">
                  <td className="border-t border-[#e8eef8] px-4 py-3 text-sm font-semibold text-[#1f3152]">
                    <span className="line-clamp-1">{ext.occupancy_period?.name ?? "—"}</span>
                  </td>
                  <td className="border-t border-[#e8eef8] px-4 py-3 text-sm text-[#667ca8]">{formatDate(ext.requested_at)}</td>
                  <td className="border-t border-[#e8eef8] px-4 py-3">
                    <StatusBadge status={ext.status} />
                  </td>
                  <td className="border-t border-[#e8eef8] px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onSelect(ext)}
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[#c8d8ef] bg-[#f8fbff] px-2.5 text-xs font-bold text-[#244cb8] transition hover:bg-white"
                    >
                      <Eye className="h-3 w-3" />
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function HistoryModal({
  loading,
  extensions,
  onSelect,
  onClose,
}: {
  loading: boolean;
  extensions: OccupancyExtension[];
  onSelect: (extension: OccupancyExtension) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell onClose={onClose} maxWidth="max-w-5xl">
      <div className="flex items-start justify-between gap-4 border-b border-[#dbe6f5] px-6 py-5">
        <div>
          <h3 className="mt-1 text-2xl font-bold text-[#1a2d52]">Lịch sử yêu cầu gia hạn</h3>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
        <HistoryTable loading={loading} extensions={extensions} onSelect={onSelect} />
      </div>
    </ModalShell>
  );
}

function EligibilityModal({
  rows,
  eligible,
  passedCount: _passedCount,
  totalCount,
  onClose,
}: {
  rows: ConditionRow[];
  eligible: boolean;
  passedCount: number;
  totalCount: number;
  onClose: () => void;
}) {
  const passedRows  = rows.filter((row) => row.passed);
  const warnedRows  = rows.filter((row) => !!row.warn);
  const failedRows  = rows.filter((row) => !row.passed && !row.warn);
  const progress = totalCount > 0 ? Math.round((passedRows.length / totalCount) * 100) : 0;

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-[#dbe6f5] px-6 py-5">
        <div>
          <h3 className="mt-1 text-2xl font-bold text-[#1a2d52]">
            {eligible ? "Đủ điều kiện gia hạn" : "Chưa đủ điều kiện gia hạn"}
          </h3>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-5">
        <div className="rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] p-4">
          <div className="mb-2 flex items-center justify-between gap-4 text-sm font-bold text-[#1f3152]">
            <span>{passedRows.length}/{totalCount} điều kiện đạt</span>
            <span className={eligible ? "text-emerald-700" : "text-[#244cb8]"}>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e7eef9]">
            <div
              className={`h-full rounded-full ${eligible ? "bg-emerald-500" : "bg-[#244cb8]"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <ConditionGroup title="Điều kiện đạt" rows={passedRows} tone="success" />
        <ConditionGroup title="Cần xét duyệt thủ công" rows={warnedRows} tone="warning" emptyText="" />
        <ConditionGroup title="Điều kiện chưa đạt" rows={failedRows} tone="danger" emptyText="Không có điều kiện chưa đạt." />
      </div>
    </ModalShell>
  );
}

function ExtensionDetailModal({
  extension,
  onClose,
}: {
  extension: OccupancyExtension;
  onClose: () => void;
}) {
  return (
    <ModalShell onClose={onClose} maxWidth="max-w-xl">
      <div className="flex items-start justify-between gap-4 border-b border-[#dbe6f5] px-6 py-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d90b5]">Chi tiết yêu cầu</p>
          <h3 className="mt-1 text-2xl font-bold text-[#1a2d52]">{extension.occupancy_period?.name ?? "Yêu cầu gia hạn"}</h3>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <div className="space-y-5 px-6 py-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailTile label="Ngày gửi" value={formatDate(extension.requested_at)} />
          <div className="rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Trạng thái</p>
            <div className="mt-2">
              <StatusBadge status={extension.status} />
            </div>
          </div>
          {extension.approved_at ? <DetailTile label="Ngày duyệt" value={formatDate(extension.approved_at)} /> : null}
          {extension.occupancy_period?.extension_until_date ? (
            <DetailTile label="Gia hạn đến" value={formatDate(extension.occupancy_period.extension_until_date)} accent />
          ) : null}
        </div>

        <TextPanel label="Lý do gia hạn" value={extension.reason} />
        {extension.admin_note ? <TextPanel label="Ghi chú admin" value={extension.admin_note} tone="blue" /> : null}
      </div>
    </ModalShell>
  );
}

function ModalShell({
  children,
  onClose,
  maxWidth,
}: {
  children: ReactNode;
  onClose: () => void;
  maxWidth: string;
}) {
  return (
    <motion.div
      key="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 py-6 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.22 }}
        className={`w-full ${maxWidth} overflow-hidden rounded-[28px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)] shadow-[0_28px_70px_rgba(27,56,122,0.28)]`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function buildConditionRows(eligibility: ExtensionEligibility | null): ConditionRow[] {
  if (!eligibility) return [];

  return [
    {
      label: "Đang trong trạng thái học tập",
      passed: eligibility.conditions.studying,
      detail: "Sinh viên cần đang trong trạng thái học tập.",
    },
    {
      label: "Không có nợ hóa đơn tiền phòng hoặc tiền điện",
      passed: eligibility.conditions.no_debt,
      detail: !eligibility.conditions.no_debt ? "Còn nợ hóa đơn chưa thanh toán." : undefined,
      action: !eligibility.conditions.no_debt ? (
        <Link to="/student/payment" className="ml-2 inline-flex items-center gap-1 font-bold text-[#244cb8] underline underline-offset-2">
          <CreditCard className="h-3 w-3" />
          Thanh toán ngay
        </Link>
      ) : undefined,
    },
    (() => {
      const seriousOk = eligibility.conditions.no_serious_violation;
      const mediumOk  = eligibility.conditions.medium_violations_ok;
      const minorOk   = eligibility.conditions.minor_violations_ok;
      const allOk     = seriousOk && mediumOk && minorOk;

      const exceeded: string[] = [];
      if (!seriousOk) exceeded.push(`nghiêm trọng ${eligibility.serious_violation_count} lần (vượt ≥ 1)`);
      if (!mediumOk)  exceeded.push(`trung bình ${eligibility.medium_violation_count} lần (vượt ≥ 2)`);
      if (!minorOk)   exceeded.push(`nhẹ ${eligibility.minor_violation_count} lần (vượt ≥ 3)`);

      return {
        label: allOk
          ? `Vi phạm kỷ luật: trong ngưỡng (nghiêm trọng ${eligibility.serious_violation_count}, trung bình ${eligibility.medium_violation_count}, nhẹ ${eligibility.minor_violation_count})`
          : `Vi phạm kỷ luật: ${exceeded.join(' | ')}`,
        passed: allOk,
        warn: !allOk && eligibility.eligible,
        detail: !allOk
          ? "Vượt ngưỡng vi phạm — yêu cầu sẽ được chuyển admin xét duyệt thủ công."
          : undefined,
      };
    })(),
    {
      label: "Không vượt quá năm 4 sau gia hạn",
      passed: eligibility.conditions.not_final_year,
      detail: "Sau khi gia hạn, sinh viên không được vượt quá năm học thứ 4.",
    },
  ];
}

function ConditionGroup({
  title,
  rows,
  tone,
  emptyText,
}: {
  title: string;
  rows: ConditionRow[];
  tone: "success" | "warning" | "danger";
  emptyText?: string;
}) {
  if (rows.length === 0 && emptyText === "") return null;

  const styles = {
    success: {
      title: "text-emerald-700",
      card: "border-emerald-200 bg-emerald-50",
      text: "text-emerald-800",
      detail: "text-emerald-700",
      icon: <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />,
    },
    warning: {
      title: "text-amber-700",
      card: "border-amber-200 bg-amber-50",
      text: "text-amber-800",
      detail: "text-amber-700",
      icon: <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />,
    },
    danger: {
      title: "text-rose-700",
      card: "border-rose-200 bg-rose-50",
      text: "text-rose-800",
      detail: "text-rose-700",
      icon: <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" />,
    },
  }[tone];

  return (
    <section>
      <h4 className={`text-sm font-bold ${styles.title}`}>{title}</h4>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-[#d6e2f1] bg-white px-4 py-3 text-sm font-semibold text-[#7c8fb5]">{emptyText ?? "Không có dữ liệu."}</p>
        ) : (
          rows.map((row) => (
            <div
              key={row.label}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${styles.card}`}
            >
              {styles.icon}
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${styles.text}`}>{row.label}</p>
                {row.detail ? (
                  <p className={`mt-1 text-xs font-medium ${styles.detail}`}>
                    {row.detail}
                    {row.action}
                  </p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function SectionTitle({ icon, title, compact = false }: { icon: ReactNode; title: string; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "mb-1"}`}>
      <span className="text-[#244cb8]">{icon}</span>
      <h2 className="text-base font-bold text-[#1a2d52]">{title}</h2>
    </div>
  );
}

function BannerMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-[160px] rounded-xl border border-[#c8d8ef] bg-white/75 px-3 py-2 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#6f84ad]">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${accent ? "text-emerald-700" : "text-[#1a2d52]"}`}>{value}</p>
    </div>
  );
}

function StatCard({ icon, label, value, accent = false }: { icon: ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex min-h-[64px] items-center gap-2.5 border-b border-r border-[#e1e9f6] bg-[#f8fbff] p-3 last:border-r-0 sm:[&:nth-child(2n)]:border-r-0 lg:border-b-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(4n)]:border-r-0">
      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${accent ? "bg-emerald-50 text-emerald-600" : "bg-[#eef4ff] text-[#244cb8]"}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#7c8fb5]">{label}</p>
        <p className={`mt-0.5 max-w-full truncate text-sm font-bold ${accent ? "text-emerald-700" : "text-[#1f3152]"}`}>{value || "—"}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OccupancyExtension["status"] }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function DetailTile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[#d6e2f1] bg-[#f8fbff] p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#6f84ad]">{label}</p>
      <p className={`mt-1 text-sm font-bold ${accent ? "text-emerald-700" : "text-[#1f3152]"}`}>{value}</p>
    </div>
  );
}

function TextPanel({ label, value, tone = "plain" }: { label: string; value: string; tone?: "plain" | "blue" }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">{label}</p>
      <p className={`whitespace-pre-wrap rounded-2xl border p-4 text-sm leading-6 ${tone === "blue" ? "border-[#c9d8ef] bg-[#f2f7ff] text-[#1b3766]" : "border-[#d6e2f1] bg-white text-[#1f3152]"}`}>
        {value}
      </p>
    </div>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-[#bfd2ee] bg-white p-2 text-[#6681b1] transition hover:text-[#244cb8]"
      aria-label="Đóng"
      title="Đóng"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
