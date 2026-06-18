import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Clock, LoaderCircle, RefreshCw } from "lucide-react";
import { getLatestRegistrationByEmail } from "../../../api/registrationService";
import { checkEligibility, type EligibilityResult } from "../../../api/registrationApi";
import type { RegistrationRequest } from "../../admin/data/registrationRequests";
import { useAuthStore } from "../../auth/store";

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
  const studentEmail = useAuthStore((state) => state.user?.email ?? "");
  const [registration, setRegistration] = useState<RegistrationRequest | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRegistration = useCallback(
    async (isMounted: () => boolean = () => true) => {
      if (!studentEmail) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const [data, eligRes] = await Promise.all([
          getLatestRegistrationByEmail(studentEmail),
          checkEligibility(studentEmail).catch(() => ({ eligible: false } as EligibilityResult)),
        ]);

        if (!isMounted()) return;

        if (!data) {
          navigate("/student/registration", { replace: true });
          return;
        }

        if (
          data.blacklist ||
          data.occupancy_status === "forced_checkout" ||
          eligRes.reason_code === "blacklisted"
        ) {
          navigate("/student/room", { replace: true });
          return;
        }

        setRegistration(data);
        setEligibility(eligRes);
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
    let mounted = true;

    void loadRegistration(() => mounted);

    return () => {
      mounted = false;
    };
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

  const hasBedAssigned =
    Boolean(registration.bedId) &&
    registration.bed_approval_status === "approved";

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
      ) : registration.status === "approved" ? (
        <div className="w-full max-w-3xl rounded-2xl border border-emerald-200 bg-emerald-50/95 p-6 text-center shadow-[0_12px_24px_rgba(16,185,129,0.14)]">
          <StatusTimeline status={registration.status} />
          <p className="mt-3 font-semibold text-emerald-900">Hoàn tất đăng ký nội trú</p>
          <p className="mt-1.5 text-sm text-emerald-700">
            {hasBedAssigned
              ? "Bạn đã được phân phòng. Nhấn bên dưới để xem thông tin phòng."
              : "Đơn của bạn đã được duyệt. Ban quản lý sẽ sắp xếp phòng cho bạn sớm."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/student/room")}
            className="auth-btn-gloss mx-auto mt-4 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#31b7d4_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(36,76,184,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
          >
            <span className="auth-btn-gloss__content">
              {hasBedAssigned ? "Xem thông tin phòng" : "Xem phòng của tôi"}
            </span>
          </button>
        </div>
      ) : (
        <div className="w-full max-w-3xl rounded-2xl border border-amber-200 bg-[linear-gradient(180deg,#fffdf3_0%,#fff7db_100%)] p-6 text-center shadow-[0_14px_28px_rgba(180,120,0,0.14)]">
          <StatusTimeline status={registration.status} />
          <p className="mt-3 font-semibold text-[#7a4d00]">Đơn đang chờ xét duyệt</p>
          <p className="mt-1.5 text-sm text-[#8a6a2a]">
            Kết quả sẽ được thông báo sau khi ban quản lý xem xét.
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
      </div>
    </motion.div>
  );
}
