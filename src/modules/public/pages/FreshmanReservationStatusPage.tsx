import { AlertCircle, ArrowLeft, LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { lookupDormReservation, type ReservationProgress, type ReservationStatus } from "../../../api/dormReservationApi";
import ReservationProgressCard, { reservationStatusLabel } from "../components/ReservationProgressCard";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_22px_40px_rgba(36,76,184,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";
const secondaryBtn =
  "inline-flex items-center gap-2 rounded-2xl border border-[#c5d4f0] bg-[linear-gradient(135deg,#ffffff_0%,#f1f6ff_48%,#e8f0ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#244CB8] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_22px_rgba(36,76,184,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a9c0ea] hover:text-[#173D97] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_16px_28px_rgba(36,76,184,0.16)] active:scale-[0.98] disabled:opacity-50";
const inputCls =
  "mt-1 h-11 w-full rounded-xl border border-[#D6E2F1] bg-[#F6F9FD] px-4 pl-11 pr-12 text-sm text-[#1F3152] placeholder:text-[#90A2BF] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-all duration-300 ease-out hover:border-[#B9CDEE] hover:bg-white hover:shadow-[0_14px_28px_rgba(36,76,184,0.10)] focus:border-[#244CB8] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#244CB8]/14";

type LookupState = {
  reservationCode?: string;
} | null;

const getNextSteps = (status: ReservationStatus): string[] => {
  if (status === "approved") {
    return [
      "Chờ trường xác nhận nhập học.",
      "Sau khi được cấp MSSV, bạn sẽ đăng ký nội trú chính thức.",
      "Hệ thống sẽ thông báo khi có thể thực hiện bước tiếp theo.",
    ];
  }

  if (status === "submitted") {
    return [
      "Ban quản lý KTX sẽ tiếp nhận và xem xét hồ sơ giữ chỗ.",
      "Bạn có thể dùng mã hồ sơ để tiếp tục theo dõi trạng thái xử lý.",
      "Hệ thống sẽ cập nhật khi hồ sơ được xét duyệt.",
    ];
  }

  if (status === "waitlisted") {
    return [
      "Hồ sơ đang nằm trong danh sách chờ.",
      "Vui lòng tiếp tục theo dõi trạng thái trên website.",
      "Hệ thống sẽ thông báo khi có thay đổi về kết quả giữ chỗ.",
    ];
  }

  if (status === "converted") {
    return [
      "Hồ sơ giữ chỗ đã được chuyển thành đơn đăng ký nội trú chính thức.",
      "Vui lòng đăng nhập bằng MSSV để tiếp tục theo dõi đơn nội trú.",
      "Không cần tạo thêm hồ sơ giữ chỗ mới.",
    ];
  }

  if (status === "rejected") {
    return [
      "Hồ sơ giữ chỗ không được duyệt.",
      "Vui lòng xem thông tin trạng thái và liên hệ Ban quản lý KTX nếu cần hỗ trợ.",
    ];
  }

  if (status === "cancelled") {
    return [
      "Hồ sơ giữ chỗ đã bị hủy.",
      "Nếu đợt đăng ký vẫn còn mở và đủ điều kiện, bạn cần tạo hồ sơ giữ chỗ mới.",
    ];
  }

  return [
    "Hồ sơ giữ chỗ đã hết hiệu lực.",
    "Vui lòng theo dõi thông báo từ Ban quản lý KTX nếu cần nộp lại hồ sơ.",
  ];
};

const infoValue = (value: string | null | undefined) => value?.trim() || null;

export default function FreshmanReservationStatusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LookupState;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [reservationCode, setReservationCode] = useState(state?.reservationCode ?? "");
  const [reservation, setReservation] = useState<ReservationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async (lookupValue = reservationCode) => {
    const code = lookupValue.trim().toUpperCase();
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
    const initialCode = state?.reservationCode?.trim();
    if (initialCode) {
      const normalizedCode = initialCode.toUpperCase();
      setReservationCode(normalizedCode);
      void handleLookup(normalizedCode);
      navigate(location.pathname, { replace: true, state: null });
    }
    // Chỉ auto-lookup một lần khi nhận mã qua navigation state, rồi xóa state khỏi history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetLookup = () => {
    setReservation(null);
    setReservationCode("");
    setError(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

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
                  ref={inputRef}
                  type="text"
                  value={reservationCode}
                  onChange={(e) => {
                    setReservationCode(e.target.value.toUpperCase());
                    setError(null);
                    setReservation(null);
                  }}
                  placeholder="DORM-YYYYMMDD-XXXXXX"
                  className={inputCls}
                />
                {reservationCode && (
                  <button
                    type="button"
                    onClick={resetLookup}
                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#90A2BF] transition hover:bg-[#e8f0ff] hover:text-[#244CB8] focus:outline-none focus:ring-2 focus:ring-[#244CB8]/20"
                    aria-label="Xóa mã hồ sơ"
                    title="Xóa mã hồ sơ"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs font-medium leading-5 text-[#6F84A7]">
                Mã hồ sơ giữ chỗ được cấp sau khi bạn gửi hồ sơ thành công. Vui lòng lưu lại để tra cứu tiến trình xử lý.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate("/freshman-reservation")}
                className={secondaryBtn}
                aria-label="Quay lại đăng ký giữ chỗ"
                title="Quay lại đăng ký giữ chỗ"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </button>
              <button type="button" disabled={loading} onClick={() => void handleLookup()} className={primaryBtn}>
                {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Tra cứu
              </button>
            </div>
          </div>
        </div>

        {reservation && (
          <div className="mt-5 space-y-5">
            {reservation.candidate && (
              <div className="rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f6faff_100%)] p-5 shadow-[0_14px_30px_rgba(36,76,184,0.08)] sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-[#1F3152]">Thông tin thí sinh</h2>
                  <span className="rounded-lg border border-[#c8d8ef] bg-[#f5f9ff] px-2.5 py-1 text-xs font-semibold text-[#244CB8]">
                    {reservationStatusLabel[reservation.status]}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  {[
                    ["Họ và tên", infoValue(reservation.candidate.fullName)],
                    ["Ngành trúng tuyển", infoValue(reservation.candidate.majorName)],
                    ["CCCD", infoValue(reservation.candidate.maskedCccd)],
                    ["Email", infoValue(reservation.candidate.maskedEmail)],
                    ["Số điện thoại", infoValue(reservation.candidate.maskedPhone)],
                  ].map(([label, value]) => value ? (
                    <div key={label} className="min-w-0 rounded-2xl border border-[#d8e6f6] bg-white/75 px-4 py-3">
                      <dt className="font-medium text-[#6F84A7]">{label}</dt>
                      <dd className="mt-1 break-words font-semibold text-[#1F3152]">{value}</dd>
                    </div>
                  ) : null)}
                </dl>
              </div>
            )}

            <ReservationProgressCard
              reservation={reservation}
              onLogin={() => navigate("/login")}
              onLookupAnother={resetLookup}
            />

            <div className="rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f6faff_100%)] p-5 shadow-[0_14px_30px_rgba(36,76,184,0.08)] sm:p-6">
              <h2 className="text-lg font-semibold text-[#1F3152]">Bước tiếp theo</h2>
              <ul className="mt-3 space-y-2 text-sm font-medium leading-6 text-[#5C7094]">
                {getNextSteps(reservation.status).map((step) => (
                  <li key={step} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#244CB8]" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
