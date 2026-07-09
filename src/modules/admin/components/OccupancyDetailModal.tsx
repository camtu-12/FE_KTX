import { motion } from "framer-motion";
import { Ban, CheckCircle2, Clock3, CircleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { fetchOccupancyDetail, type OccupancyDetail } from "../../../api/occupancyDetailApi";
import { formatDate, formatDateTime } from "../../../utils/dateFormat";

const emptyValue = "-";

export type OccupancyDetailModalStatus = "ACTIVE" | "CHECKOUT_REQUESTED" | "CHECKED_OUT" | "FORCED_CHECKOUT";

const statusMeta: Record<OccupancyDetailModalStatus, { label: string; badgeClassName: string; Icon: typeof CheckCircle2 }> = {
  ACTIVE: {
    label: "Đang lưu trú",
    badgeClassName: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    Icon: CheckCircle2,
  },
  CHECKOUT_REQUESTED: {
    label: "Yêu cầu thôi ở",
    badgeClassName: "border border-amber-200 bg-amber-50 text-amber-700",
    Icon: Clock3,
  },
  CHECKED_OUT: {
    label: "Đã thôi ở",
    badgeClassName: "border border-slate-200 bg-slate-50 text-slate-600",
    Icon: CheckCircle2,
  },
  FORCED_CHECKOUT: {
    label: "Buộc thôi ở",
    badgeClassName: "border border-rose-200 bg-rose-50 text-rose-700",
    Icon: CircleAlert,
  },
};

const getGenderLabel = (gender?: string | null) => {
  if (gender === "MALE" || gender?.toLowerCase() === "male") return "Nam";
  if (gender === "FEMALE" || gender?.toLowerCase() === "female") return "Nữ";
  return emptyValue;
};

const textOrEmpty = (value?: string | null) => (value && value.trim() ? value : emptyValue);

export type OccupancyDetailModalStudent = {
  studentCode?: string | null;
  fullName?: string | null;
  className?: string | null;
  faculty?: string | null;
  email?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
};

export type OccupancyDetailModalOccupancy = {
  roomCode: string;
  bedNumber: number | string;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  status: OccupancyDetailModalStatus;
  forcedCheckoutReason?: string | null;
  leaveRequest?: { expectedLeaveDate?: string | null; reason?: string | null } | null;
};

type OccupancyDetailModalProps = {
  occupancyId: number;
  student: OccupancyDetailModalStudent;
  occupancy: OccupancyDetailModalOccupancy;
  onClose: () => void;
  /** Chỉ hiện nút "Xác nhận thôi ở" khi được truyền — trang gọi tự lo cập nhật state của mình. */
  onConfirmCheckout?: () => void;
};

export default function OccupancyDetailModal({
  occupancyId,
  student,
  occupancy,
  onClose,
  onConfirmCheckout,
}: OccupancyDetailModalProps) {
  const [occupancyDetail, setOccupancyDetail] = useState<OccupancyDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [showAllRoomChanges, setShowAllRoomChanges] = useState(false);

  useEffect(() => {
    let isActive = true;
    setIsLoadingDetail(true);
    setOccupancyDetail(null);
    fetchOccupancyDetail(occupancyId)
      .then((data) => { if (isActive) setOccupancyDetail(data); })
      .catch(() => { if (isActive) setOccupancyDetail(null); })
      .finally(() => { if (isActive) setIsLoadingDetail(false); });
    return () => { isActive = false; };
  }, [occupancyId]);

  const meta = statusMeta[occupancy.status] ?? statusMeta.ACTIVE;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative flex max-h-[92vh] w-full max-w-[820px] flex-col overflow-hidden rounded-[28px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_72%,#e7f0ff_100%)] shadow-[0_28px_70px_rgba(27,56,122,0.28)]"
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7d90b5]">
            CHI TIẾT LƯU TRÚ
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-4">

          {/* THÔNG TIN SINH VIÊN */}
          <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
              THÔNG TIN SINH VIÊN
            </h4>
            <div className="mt-4 flex gap-4">
              <div className="flex-shrink-0">
                {isLoadingDetail ? (
                  <div className="h-20 w-20 animate-pulse rounded-full bg-[#d8e6f5]" />
                ) : occupancyDetail?.student.avatar ? (
                  <img
                    src={occupancyDetail.student.avatar}
                    alt="avatar"
                    className="h-20 w-20 rounded-full border border-[#d3e0f2] object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#dde9ff]">
                    <span className="text-2xl font-bold text-[#5573a0]">
                      {student.fullName?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                )}
              </div>
              <div className="grid flex-1 gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                <div className="flex flex-col gap-y-3">
                  <p className="text-[#5570a0]">
                    MSSV: <span className="font-semibold text-[#1b3766]">{textOrEmpty(student.studentCode)}</span>
                  </p>
                  <p className="text-[#5570a0]">
                    Họ tên: <span className="font-semibold text-[#1b3766]">{textOrEmpty(student.fullName)}</span>
                  </p>
                  <p className="text-[#5570a0]">
                    Lớp: <span className="font-semibold text-[#1b3766]">{textOrEmpty(student.className)}</span>
                  </p>
                  <p className="text-[#5570a0]">
                    Khoa: <span className="font-semibold text-[#1b3766]">{textOrEmpty(student.faculty)}</span>
                  </p>
                  <p className="text-[#5570a0]">
                    Năm học hiện tại:{" "}
                    <span className="font-semibold text-[#1b3766]">
                      {isLoadingDetail ? (
                        <span className="inline-block h-3 w-12 animate-pulse rounded bg-[#d8e6f5]" />
                      ) : occupancyDetail?.student.current_year != null ? (
                        `Năm ${occupancyDetail.student.current_year}`
                      ) : emptyValue}
                    </span>
                  </p>
                  <p className="text-[#5570a0]">
                    Email: <span className="font-semibold text-[#1b3766]">{textOrEmpty(student.email)}</span>
                  </p>
                </div>

                <div className="flex flex-col gap-y-3">
                  <p className="text-[#5570a0]">
                    Giới tính: <span className="font-semibold text-[#1b3766]">{getGenderLabel(student.gender)}</span>
                  </p>
                  <p className="text-[#5570a0]">
                    Ngày sinh:{" "}
                    <span className="font-semibold text-[#1b3766]">
                      {student.dateOfBirth ? formatDate(student.dateOfBirth) : emptyValue}
                    </span>
                  </p>
                  <p className="text-[#5570a0]">
                    Số điện thoại: <span className="font-semibold text-[#1b3766]">{textOrEmpty(student.phone)}</span>
                  </p>
                  {isLoadingDetail ? (
                    <div className="h-4 w-3/4 animate-pulse rounded bg-[#d8e6f5]" />
                  ) : (
                    <p className="text-[#5570a0]">
                      Địa chỉ thường trú:{" "}
                      <span className="font-semibold text-[#1b3766]">
                        {occupancyDetail?.student.permanent_address?.trim() || emptyValue}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* THÔNG TIN LƯU TRÚ */}
          <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
              THÔNG TIN LƯU TRÚ
            </h4>
            <div className="mt-4 grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
              <p className="text-[#5570a0]">
                Phòng: <span className="font-semibold text-[#1b3766]">{occupancy.roomCode}</span>
              </p>
              <p className="text-[#5570a0]">
                Giường: <span className="font-semibold text-[#1b3766]">#{occupancy.bedNumber}</span>
              </p>
              <p className="text-[#5570a0]">
                Thời gian lưu trú:{" "}
                <span className="font-semibold text-[#1b3766]">
                  {occupancy.checkInDate ? formatDate(occupancy.checkInDate) : emptyValue}
                  {" – "}
                  {occupancy.checkOutDate ? formatDate(occupancy.checkOutDate) : "nay"}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[#5570a0]">
                <span>Trạng thái lưu trú:</span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${meta.badgeClassName}`}
                >
                  {meta.label}
                </span>
              </div>
              {occupancy.status === "FORCED_CHECKOUT" ? (
                <p className="text-[#5570a0] md:col-span-2">
                  Lý do buộc thôi ở:{" "}
                  <span className="font-semibold text-[#1b3766]">
                    {occupancy.forcedCheckoutReason?.trim() || emptyValue}
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          {occupancy.status === "CHECKOUT_REQUESTED" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-amber-700">
                THÔNG TIN YÊU CẦU THÔI Ở
              </h4>
              <div className="mt-4 grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                <p className="text-amber-800">
                  Ngày dự kiến rời KTX:{" "}
                  <span className="font-semibold">
                    {occupancy.leaveRequest?.expectedLeaveDate
                      ? formatDate(occupancy.leaveRequest.expectedLeaveDate)
                      : emptyValue}
                  </span>
                </p>
                <p className="text-amber-800 md:col-span-2">
                  Lý do:{" "}
                  <span className="font-semibold">{occupancy.leaveRequest?.reason?.trim() || emptyValue}</span>
                </p>
              </div>
            </div>
          ) : occupancy.status !== "CHECKOUT_REQUESTED" && occupancyDetail?.cancelled_checkout_request ? (
            <div className="flex items-start gap-3 rounded-2xl border-2 border-slate-300 bg-slate-100 p-4 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200">
                <Ban className="h-4 w-4 text-slate-600" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-700">Yêu cầu thôi ở đã bị hủy</p>
                <p className="mt-1 text-sm text-slate-600">
                  Sinh viên đã hủy yêu cầu thôi ở này.
                  {occupancyDetail.cancelled_checkout_request.cancelled_at
                    ? ` (lúc ${formatDateTime(occupancyDetail.cancelled_checkout_request.cancelled_at)})`
                    : ""}
                </p>
              </div>
            </div>
          ) : null}

          {occupancy.status === "CHECKOUT_REQUESTED" && occupancyDetail && occupancyDetail.unpaid_debt > 0 ? (
            <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4">
              <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-orange-700">
                THÔNG TIN CÔNG NỢ
              </h4>
              <p className="mt-3 text-sm text-orange-800">
                Sinh viên hiện còn nợ{" "}
                <span className="font-semibold">{occupancyDetail.unpaid_debt.toLocaleString("vi-VN")}₫</span>{" "}
                (tiền phòng + tiền điện chưa thanh toán/quá hạn).
              </p>
              <p className="mt-1 text-xs text-orange-700">
                Khoản nợ này không được xóa khi thôi ở — sinh viên vẫn có nghĩa vụ thanh toán sau khi rời KTX.
              </p>
            </div>
          ) : null}

          {/* THÔNG TIN GIA ĐÌNH */}
          {isLoadingDetail ? (
            <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
              <div className="mb-4 h-3.5 w-40 animate-pulse rounded bg-[#d8e6f5]" />
              <div className="space-y-3">
                <div className="rounded-xl border border-[#e6eef8] bg-[#f5f9ff] p-3">
                  <div className="mb-2 h-3 w-8 animate-pulse rounded bg-[#d8e6f5]" />
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="h-4 animate-pulse rounded bg-[#d8e6f5]" />
                    <div className="h-4 animate-pulse rounded bg-[#d8e6f5]" />
                    <div className="h-4 animate-pulse rounded bg-[#d8e6f5]" />
                  </div>
                </div>
                <div className="rounded-xl border border-[#e6eef8] bg-[#f5f9ff] p-3">
                  <div className="mb-2 h-3 w-6 animate-pulse rounded bg-[#d8e6f5]" />
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="h-4 animate-pulse rounded bg-[#d8e6f5]" />
                    <div className="h-4 animate-pulse rounded bg-[#d8e6f5]" />
                    <div className="h-4 animate-pulse rounded bg-[#d8e6f5]" />
                  </div>
                </div>
                <div className="h-4 w-2/3 animate-pulse rounded bg-[#d8e6f5]" />
              </div>
            </div>
          ) : occupancyDetail ? (
            <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
              <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                THÔNG TIN GIA ĐÌNH
              </h4>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-[#e6eef8] bg-[#f5f9ff] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8aa4cc]">Cha</p>
                  <div className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                    <p className="text-[#5570a0]">
                      Họ tên: <span className="font-semibold text-[#1b3766]">{occupancyDetail.family.father_name?.trim() || emptyValue}</span>
                    </p>
                    <p className="text-[#5570a0]">
                      Năm sinh: <span className="font-semibold text-[#1b3766]">{occupancyDetail.family.father_birth_year?.trim() || emptyValue}</span>
                    </p>
                    <p className="text-[#5570a0]">
                      SĐT: <span className="font-semibold text-[#1b3766]">{occupancyDetail.family.father_phone?.trim() || emptyValue}</span>
                    </p>
                    <p className="text-[#5570a0]">
                      Nghề nghiệp: <span className="font-semibold text-[#1b3766]">{occupancyDetail.family.father_occupation?.trim() || emptyValue}</span>
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-[#e6eef8] bg-[#f5f9ff] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8aa4cc]">Mẹ</p>
                  <div className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                    <p className="text-[#5570a0]">
                      Họ tên: <span className="font-semibold text-[#1b3766]">{occupancyDetail.family.mother_name?.trim() || emptyValue}</span>
                    </p>
                    <p className="text-[#5570a0]">
                      Năm sinh: <span className="font-semibold text-[#1b3766]">{occupancyDetail.family.mother_birth_year?.trim() || emptyValue}</span>
                    </p>
                    <p className="text-[#5570a0]">
                      SĐT: <span className="font-semibold text-[#1b3766]">{occupancyDetail.family.mother_phone?.trim() || emptyValue}</span>
                    </p>
                    <p className="text-[#5570a0]">
                      Nghề nghiệp: <span className="font-semibold text-[#1b3766]">{occupancyDetail.family.mother_occupation?.trim() || emptyValue}</span>
                    </p>
                  </div>
                </div>
                <p className="px-1 text-sm text-[#5570a0]">
                  Địa chỉ liên hệ: <span className="font-semibold text-[#1b3766]">{occupancyDetail.family.parent_address?.trim() || emptyValue}</span>
                </p>
              </div>
            </div>
          ) : null}

          {/* LỊCH SỬ LƯU TRÚ */}
          {isLoadingDetail ? (
            <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
              <div className="mb-4 h-3.5 w-36 animate-pulse rounded bg-[#d8e6f5]" />
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-4 flex-1 animate-pulse rounded bg-[#d8e6f5]" />
                    <div className="h-4 flex-1 animate-pulse rounded bg-[#d8e6f5]" />
                    <div className="h-4 flex-1 animate-pulse rounded bg-[#d8e6f5]" />
                    <div className="h-4 flex-1 animate-pulse rounded bg-[#d8e6f5]" />
                  </div>
                ))}
              </div>
            </div>
          ) : occupancyDetail ? (
            <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
              <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                LỊCH SỬ LƯU TRÚ
              </h4>
              {occupancyDetail.occupancy_history.length === 0 ? (
                <p className="mt-3 text-sm text-[#7a9cc0]">Đây là lần lưu trú đầu tiên.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#dce9f5] text-left text-xs font-semibold uppercase tracking-wide text-[#8aa4cc]">
                        <th className="pb-2 pr-4">Năm học</th>
                        <th className="pb-2 pr-4">Học kỳ</th>
                        <th className="pb-2 pr-4">Phòng</th>
                        <th className="pb-2 pr-4">Giường</th>
                        <th className="pb-2 pr-4">Ngày vào</th>
                        <th className="pb-2">Ngày ra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {occupancyDetail.occupancy_history.map((h) => (
                        <tr
                          key={h.id}
                          className={`border-b border-[#edf3fb] last:border-0 ${h.is_current ? "bg-blue-50/60" : ""}`}
                        >
                          <td className="py-2 pr-4 text-[#1b3766]">
                            {h.school_year ?? emptyValue}
                            {h.is_current && (
                              <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                                Hiện tại
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-[#1b3766]">{h.semester ?? emptyValue}</td>
                          <td className="py-2 pr-4 font-medium text-[#1b3766]">
                            {h.building_code}{h.room_number || emptyValue}
                          </td>
                          <td className="py-2 pr-4 text-[#1b3766]">
                            {h.bed_number ? `#${h.bed_number}` : emptyValue}
                          </td>
                          <td className="py-2 pr-4 text-[#1b3766]">
                            {h.check_in_date ? formatDate(h.check_in_date) : emptyValue}
                          </td>
                          <td className="py-2 text-[#1b3766]">
                            {h.check_out_date ? (
                              <span>
                                {formatDate(h.check_out_date)}
                                {h.status === "ACTIVE" && (() => {
                                  const days = Math.ceil((new Date(h.check_out_date).getTime() - Date.now()) / 86_400_000);
                                  return days >= 0 && days < 30 ? (
                                    <span className="ml-1 text-[10px] font-semibold text-amber-500">
                                      (còn {days} ngày)
                                    </span>
                                  ) : null;
                                })()}
                              </span>
                            ) : (
                              <span className="text-[#8aa4cc]">Chưa xác định</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {/* VI PHẠM GẦN ĐÂY */}
          {isLoadingDetail ? (
            <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
              <div className="mb-4 h-3.5 w-32 animate-pulse rounded bg-[#d8e6f5]" />
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-[#d8e6f5]" />
                ))}
              </div>
            </div>
          ) : occupancyDetail ? (
            <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
              <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                VI PHẠM GẦN ĐÂY
              </h4>
              {occupancyDetail.recent_violations.length === 0 ? (
                <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                  Không có vi phạm nào được ghi nhận.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {occupancyDetail.recent_violations.map((v) => (
                    <div key={v.id} className="flex items-start gap-3 rounded-xl border border-[#e6eef8] bg-[#f5f9ff] px-3 py-2.5 text-sm">
                      <div className="flex-1">
                        <span className="font-semibold text-[#1b3766]">{v.type_name || emptyValue}</span>
                        {v.note ? <span className="ml-1 text-[#7a9cc0]">— {v.note}</span> : null}
                        <span className="ml-2 text-xs text-[#9ab2ce]">
                          {v.activity_date ? formatDate(v.activity_date) : ""}
                        </span>
                      </div>
                      {v.level ? (
                        <span
                          className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                            v.level === "SERIOUS"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : v.level === "MEDIUM"
                                ? "border-orange-200 bg-orange-50 text-orange-700"
                                : "border-yellow-200 bg-yellow-50 text-yellow-700"
                          }`}
                        >
                          {v.level === "SERIOUS" ? "Nghiêm trọng" : v.level === "MEDIUM" ? "Trung bình" : "Nhẹ"}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* TÌNH TRẠNG HÓA ĐƠN */}
          {isLoadingDetail ? (
            <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
              <div className="mb-4 h-3.5 w-40 animate-pulse rounded bg-[#d8e6f5]" />
              <div className="space-y-2">
                <div className="h-12 animate-pulse rounded-xl bg-[#d8e6f5]" />
                <div className="h-12 animate-pulse rounded-xl bg-[#d8e6f5]" />
              </div>
            </div>
          ) : occupancyDetail ? (
            <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
              <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                TÌNH TRẠNG HÓA ĐƠN
              </h4>
              <div className="mt-3 space-y-3 text-sm">
                {occupancyDetail.current_invoice ? (
                  <div className="flex items-center justify-between rounded-xl border border-[#e6eef8] bg-[#f5f9ff] px-4 py-3">
                    <span className="text-[#5570a0]">
                      Hóa đơn tháng {occupancyDetail.current_invoice.month}/{occupancyDetail.current_invoice.year}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-[#1b3766]">
                        {occupancyDetail.current_invoice.amount.toLocaleString("vi-VN")}₫
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                          occupancyDetail.current_invoice.status === "paid" || occupancyDetail.current_invoice.status === "exempted"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {occupancyDetail.current_invoice.status === "paid"
                          ? "Đã thanh toán"
                          : occupancyDetail.current_invoice.status === "exempted"
                            ? "Đã miễn"
                            : "Chưa thanh toán"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[#7a9cc0]">Chưa có hóa đơn tháng này.</p>
                )}
                {occupancyDetail.total_debt > 0 ? (
                  <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                    <span className="font-semibold text-rose-700">Tổng nợ hiện tại</span>
                    <span className="text-lg font-bold text-rose-600">
                      {occupancyDetail.total_debt.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                ) : (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 font-medium text-emerald-700">
                    Không có khoản nợ.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {/* YÊU CẦU HỖ TRỢ */}
          {isLoadingDetail ? (
            <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
              <div className="mb-4 h-3.5 w-44 animate-pulse rounded bg-[#d8e6f5]" />
              <div className="space-y-2">
                <div className="h-10 animate-pulse rounded-xl bg-[#d8e6f5]" />
                <div className="h-10 animate-pulse rounded-xl bg-[#d8e6f5]" />
              </div>
            </div>
          ) : occupancyDetail ? (
            <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
              <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                YÊU CẦU HỖ TRỢ
              </h4>
              {occupancyDetail.support_requests.length === 0 ? (
                <p className="mt-3 text-sm text-[#7a9cc0]">Chưa có yêu cầu nào.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#dce9f5] text-xs font-semibold uppercase tracking-wide text-[#8aa4cc]">
                        <th className="pb-2 pr-4">Tiêu đề</th>
                        <th className="pb-2 pr-4">Ngày gửi</th>
                        <th className="pb-2">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf3fb]">
                      {occupancyDetail.support_requests.map((req) => {
                        const reqStatusMeta: Record<string, { label: string; cls: string }> = {
                          pending:    { label: "Chờ xử lý",   cls: "border-amber-200 bg-amber-50 text-amber-700" },
                          processing: { label: "Đang xử lý",  cls: "border-blue-200 bg-blue-50 text-blue-700" },
                          approved:   { label: "Đã duyệt",    cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
                          rejected:   { label: "Từ chối",     cls: "border-rose-200 bg-rose-50 text-rose-700" },
                          completed:  { label: "Hoàn thành",  cls: "border-slate-200 bg-slate-50 text-slate-600" },
                        };
                        const sm = reqStatusMeta[req.status] ?? { label: req.status, cls: "border-gray-200 bg-gray-50 text-gray-600" };
                        return (
                          <tr key={req.id} className="text-[#2d4a7a]">
                            <td className="py-2 pr-4 text-[#5570a0]">{req.title ?? "—"}</td>
                            <td className="py-2 pr-4 text-[#5570a0]">
                              {req.created_at ? new Date(req.created_at).toLocaleDateString("vi-VN") : "—"}
                            </td>
                            <td className="py-2">
                              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${sm.cls}`}>
                                {sm.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {/* LỊCH SỬ CHUYỂN PHÒNG/GIƯỜNG */}
          {isLoadingDetail ? (
            <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
              <div className="mb-4 h-3.5 w-56 animate-pulse rounded bg-[#d8e6f5]" />
              <div className="space-y-2">
                <div className="h-10 animate-pulse rounded-xl bg-[#d8e6f5]" />
                <div className="h-10 animate-pulse rounded-xl bg-[#d8e6f5]" />
              </div>
            </div>
          ) : occupancyDetail ? (() => {
              const PAGE = 5;
              const allLogs = occupancyDetail.room_change_history;
              const visibleLogs = showAllRoomChanges ? allLogs : allLogs.slice(-PAGE);
              const hasMore = allLogs.length > PAGE;

              const getBadge = (log: (typeof allLogs)[number]): { label: string; cls: string } => {
                if (log.change_type === "PERMANENT") {
                  const sameRoom = log.old_room_code === log.new_room_code && log.old_room_code !== null;
                  return sameRoom
                    ? { label: "Đổi giường",   cls: "border-blue-200 bg-blue-50 text-blue-700" }
                    : { label: "Chuyển phòng", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" };
                }
                if (log.change_type === "TEMPORARY_MAINTENANCE") {
                  return log.is_temporary
                    ? { label: "Tạm chuyển",          cls: "border-amber-200 bg-amber-50 text-amber-700" }
                    : { label: "Trả về sau bảo trì",  cls: "border-cyan-200 bg-cyan-50 text-cyan-700" };
                }
                if (log.change_type === "ADMIN_TRANSFER") return { label: "Admin chuyển", cls: "border-slate-200 bg-slate-100 text-slate-600" };
                if (log.change_type === "SWAP")            return { label: "Hoán đổi",    cls: "border-violet-200 bg-violet-50 text-violet-700" };
                return { label: log.change_type, cls: "border-gray-200 bg-gray-50 text-gray-600" };
              };

              const formatLocation = (roomCode: string | null, bedNumber: string | null) => {
                if (!roomCode) return "—";
                return bedNumber ? `${roomCode} #${bedNumber}` : roomCode;
              };

              const formatDetail = (log: (typeof allLogs)[number]) => {
                const from = formatLocation(log.old_room_code, log.old_bed_number);
                const to   = formatLocation(log.new_room_code, log.new_bed_number);
                if (log.old_room_code && log.new_room_code && log.old_room_code === log.new_room_code) {
                  return `Phòng ${log.old_room_code}: #${log.old_bed_number ?? "?"} → #${log.new_bed_number ?? "?"}`;
                }
                return `${from} → ${to}`;
              };

              return (
                <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                  <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                    LỊCH SỬ CHUYỂN PHÒNG/GIƯỜNG
                  </h4>
                  {allLogs.length === 0 ? (
                    <p className="mt-3 text-sm text-[#7a9cc0]">Chưa có lịch sử chuyển phòng/giường.</p>
                  ) : (
                    <>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-[#dce9f5] text-xs font-semibold uppercase tracking-wide text-[#8aa4cc]">
                              <th className="pb-2 pr-4">Ngày</th>
                              <th className="pb-2 pr-4">Loại</th>
                              <th className="pb-2 pr-4">Chi tiết</th>
                              <th className="pb-2">Nguồn</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#edf3fb]">
                            {visibleLogs.map((log) => {
                              const badge = getBadge(log);
                              return (
                                <tr key={log.id} className="text-[#2d4a7a]">
                                  <td className="py-2 pr-4 text-[#5570a0]">
                                    {log.transferred_at ? new Date(log.transferred_at).toLocaleDateString("vi-VN") : "—"}
                                  </td>
                                  <td className="py-2 pr-4">
                                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.cls}`}>
                                      {badge.label}
                                    </span>
                                  </td>
                                  <td className="py-2 pr-4 font-medium">{formatDetail(log)}</td>
                                  <td className="py-2 text-[#5570a0]">
                                    {log.change_source === "student_request" ? "Sinh viên" : "Admin"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => setShowAllRoomChanges((v) => !v)}
                          className="mt-2 text-xs font-semibold text-[#2f63da] hover:underline"
                        >
                          {showAllRoomChanges ? "Thu gọn" : `Xem thêm ${allLogs.length - PAGE} mục`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })()
            : null}

        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[#d3e0f2] px-6 py-4">
          {onConfirmCheckout && occupancy.status === "CHECKOUT_REQUESTED" ? (
            <button
              type="button"
              onClick={onConfirmCheckout}
              className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#1f9a60_0%,#35bf7a_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(31,154,96,0.22)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
            >
              <span className="auth-btn-gloss__content">Xác nhận thôi ở</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
