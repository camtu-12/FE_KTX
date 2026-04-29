import { motion } from "framer-motion";
import { ArrowLeft, ArrowUp, CheckCircle2, CircleAlert, Clock3, ShieldCheck, UserCircle2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  departmentOptions,
  documentLabels,
  relationshipOptions,
  statusMap,
  type RegistrationRequest,
  type RegistrationStatus,
} from "../data/registrationRequests";
import { getRegistrationRequestByIdInstant } from "../../../api/registrationMockApi";

const statusIconMap: Record<RegistrationStatus, typeof Clock3> = {
  pending: Clock3,
  approved: CheckCircle2,
  rejected: CircleAlert,
  completed: CheckCircle2,
};

const readOnlyFieldClassName =
  "mt-1 h-11 w-full rounded-xl border border-[#D6E2F1] bg-[#F6F9FD] px-4 text-sm text-[#1F3152] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]";

const readOnlySelectClassName = `${readOnlyFieldClassName} appearance-none`;

type DetailRouteState = {
  request?: RegistrationRequest;
  returnToModal?: boolean;
};

export default function AdminRegistrationDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { registrationId } = useParams();
  const routeState = location.state as DetailRouteState | null;
  const [isScrollToTopVisible, setIsScrollToTopVisible] = useState(false);

  const request = useMemo(() => {
    const requestFromState = routeState?.request;
    if (requestFromState) {
      return requestFromState;
    }

    const id = Number(registrationId);
    return Number.isNaN(id) ? null : getRegistrationRequestByIdInstant(id);
  }, [registrationId, routeState?.request]);

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

  if (!request) {
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
  const relationshipLabel =
    relationshipOptions.find((option) => option.value === request.formData.relationship)?.label ?? "Khác";

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
            aria-label="Quay lại popup xem đơn"
            className="absolute left-0 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#c4d7f2] bg-white/90 text-[#40619a] shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-[#9cb9e7] hover:text-[#244cb8]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-[#1a2d52]">
                Đơn đăng ký nội trú
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-7 text-[#5c7094]">
                Bản xem chi tiết hồ sơ sinh viên đã nộp. Quản trị viên chỉ có thể xem, không thể chỉnh sửa.
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
              <h2 className="text-lg font-semibold text-[#1F3152]">Thông tin cơ bản</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#5A7094]">MSSV</label>
              <input readOnly value={request.formData.mssv} className={readOnlyFieldClassName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A7094]">Họ và tên</label>
              <input readOnly value={request.formData.fullName} className={readOnlyFieldClassName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A7094]">Giới tính</label>
              <select disabled value={request.formData.gender} className={readOnlySelectClassName}>
                <option value="">Chọn giới tính</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A7094]">Lớp</label>
              <input readOnly value={request.formData.class} className={readOnlyFieldClassName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A7094]">Khoa</label>
              <select disabled value={request.formData.department} className={readOnlySelectClassName}>
                <option value="">Chọn khoa</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A7094]">Số điện thoại</label>
              <input readOnly value={request.formData.phone} className={readOnlyFieldClassName} />
            </div>
          </div>
        </motion.div>

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
              <h2 className="text-lg font-semibold text-[#1F3152]">Chứng thực</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wide text-[#5A7094]">Số CCCD</label>
              <input readOnly value={request.formData.cccd} className={readOnlyFieldClassName} />
            </div>
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wide text-[#5A7094]">
                Địa chỉ thường trú
              </label>
              <input readOnly value={request.formData.address} className={readOnlyFieldClassName} />
            </div>
          </div>

          <div className="rounded-[22px] border border-[#c9d8ef] bg-[linear-gradient(180deg,#eef5ff_0%,#e7f0ff_42%,#edf4fd_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold uppercase tracking-wide text-[#5578AC]">Hồ sơ ảnh đính kèm</h3>
                <p className="mt-1 text-sm text-[#6981aa]">Bản xem tài liệu sinh viên đã tải lên.</p>
              </div>
              
            </div>

            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:[grid-template-columns:repeat(3,minmax(0,15rem))] lg:justify-between lg:gap-8">
              {Object.entries(request.documents).map(([field, src]) => (
                <div
                  key={field}
                  className="rounded-3xl border border-[#bfd2ec] bg-[linear-gradient(180deg,#f5f9ff_0%,#edf4ff_100%)] p-3 shadow-[inset_0_0_0_1px_rgba(185,205,234,0.24)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#204178]">
                        {documentLabels[field as keyof typeof documentLabels]}
                      </p>
                    </div>
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#eef4ff_0%,#e2ecff_100%)] text-[#244CB8]">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-[#cfdbef] bg-white">
                    <img
                      src={src}
                      alt={documentLabels[field as keyof typeof documentLabels]}
                      className="h-48 w-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          transition={{ duration: 0.22 }}
          className="space-y-4 rounded-[22px] border border-[#cfdcf0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)] sm:p-7"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#315ec7] bg-[radial-gradient(circle_at_30%_30%,#2558c7_0%,#214cb3_55%,#193d8f_100%)] text-[#9fd4ff] shadow-[inset_0_1px_0_rgba(120,169,255,0.26),0_12px_24px_rgba(36,76,184,0.18)]">
              <Users className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">Bước 3</span>
              <h2 className="text-lg font-semibold text-[#1F3152]">Người thân</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#5A7094]">Tên người thân</label>
              <input readOnly value={request.formData.relationName} className={readOnlyFieldClassName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A7094]">Số điện thoại</label>
              <input readOnly value={request.formData.relationPhone} className={readOnlyFieldClassName} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#5A7094]">Quan hệ</label>
              <input readOnly value={relationshipLabel} className={readOnlyFieldClassName} />
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
