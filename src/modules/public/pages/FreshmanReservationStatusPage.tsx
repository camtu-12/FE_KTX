import { AlertCircle, ArrowLeft, LoaderCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { lookupDormReservation, type ReservationProgress } from "../../../api/dormReservationApi";
import ReservationProgressCard from "../components/ReservationProgressCard";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_22px_40px_rgba(36,76,184,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";
const secondaryBtn =
  "inline-flex items-center gap-2 rounded-2xl border border-[#c5d4f0] bg-[linear-gradient(135deg,#ffffff_0%,#f1f6ff_48%,#e8f0ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#244CB8] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_22px_rgba(36,76,184,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a9c0ea] hover:text-[#173D97] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_16px_28px_rgba(36,76,184,0.16)] active:scale-[0.98] disabled:opacity-50";
const inputCls =
  "mt-1 h-11 w-full rounded-xl border border-[#D6E2F1] bg-[#F6F9FD] px-4 pl-11 text-sm text-[#1F3152] placeholder:text-[#90A2BF] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-all duration-300 ease-out hover:border-[#B9CDEE] hover:bg-white hover:shadow-[0_14px_28px_rgba(36,76,184,0.10)] focus:border-[#244CB8] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#244CB8]/14";

type LookupState = {
  reservationCode?: string;
} | null;

export default function FreshmanReservationStatusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LookupState;
  const [reservationCode, setReservationCode] = useState(state?.reservationCode ?? "");
  const [reservation, setReservation] = useState<ReservationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async () => {
    const code = reservationCode.trim().toUpperCase();
    setError(null);
    setReservation(null);

    if (!code) {
      setError("Vui lòng nhập mã hồ sơ giữ chỗ.");
      return;
    }

    setLoading(true);
    try {
      const result = await lookupDormReservation({ reservation_code: code });
      setReservation(result.reservation);
      setReservationCode(result.reservation.reservationCode ?? code);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Không thể tra cứu hồ sơ lúc này. Vui lòng thử lại sau.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (state?.reservationCode) {
      void handleLookup();
    }
    // Chỉ auto-lookup một lần khi nhận mã qua navigation state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-110px)] overflow-hidden bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] px-4 py-6 sm:py-8">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#2f63da]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-7rem] top-28 h-80 w-80 rounded-full bg-[#31b7d4]/12 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(#2f63da0f_1px,transparent_1px),linear-gradient(90deg,#2f63da0f_1px,transparent_1px)] [background-size:34px_34px]" />

      <div className="relative mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_62%,#31b7d4_100%)] text-white shadow-[0_18px_34px_rgba(36,76,184,0.24)] ring-8 ring-white/70">
            <Search className="h-8 w-8" />
          </span>
          <h1 className="text-[2rem] font-extrabold leading-tight text-[#15305f] sm:text-[2.25rem]">
            Tra cứu trạng thái hồ sơ giữ chỗ
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#5f7498] sm:text-base">
            Nhập mã hồ sơ giữ chỗ đã nhận sau khi đăng ký để xem tiến trình xử lý.
          </p>
        </div>

        <div className="rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-5 shadow-[0_14px_30px_rgba(36,76,184,0.08)] sm:p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#5A7094]">
                Mã hồ sơ giữ chỗ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#90A2BF]" />
                <input
                  type="text"
                  value={reservationCode}
                  onChange={(e) => {
                    setReservationCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="DORM-YYYYMMDD-XXXXXX"
                  className={inputCls}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => navigate("/freshman-reservation")} className={secondaryBtn}>
                <ArrowLeft className="h-4 w-4" />
                Quay lại đăng ký giữ chỗ
              </button>
              <button type="button" disabled={loading} onClick={() => void handleLookup()} className={primaryBtn}>
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Tra cứu
              </button>
            </div>
          </div>
        </div>

        {reservation && (
          <div className="mt-5">
            <ReservationProgressCard
              reservation={reservation}
              onLogin={() => navigate("/login")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
