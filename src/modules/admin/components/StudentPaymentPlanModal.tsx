import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createStudentPaymentPlan,
  deactivateStudentPaymentPlan,
  listStudentPaymentPlans,
  type StudentPaymentPlan,
} from "../../../api/paymentApi";
import { formatDate } from "../../../utils/dateFormat";

const typeLabel: Record<StudentPaymentPlan["type"], string> = {
  installment: "Đóng theo tháng",
  discount: "Giảm giá dài hạn",
};

export default function StudentPaymentPlanModal({
  studentId,
  studentLabel,
  onClose,
}: {
  studentId: number;
  studentLabel: string;
  onClose: () => void;
}) {
  const [plans, setPlans] = useState<StudentPaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [installmentReason, setInstallmentReason] = useState("");
  const [showDiscountForm, setShowDiscountForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listStudentPaymentPlans(studentId);
      setPlans(data);
    } catch {
      setError("Không thể tải danh sách chế độ đặc biệt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const activeInstallment = plans.find((p) => p.type === "installment" && p.isActive);
  const activeDiscount = plans.find((p) => p.type === "discount" && p.isActive);
  const history = plans.filter((p) => !p.isActive);

  const handleActivateInstallment = async () => {
    setError("");
    try {
      await createStudentPaymentPlan(studentId, { type: "installment", reason: installmentReason || undefined });
      setInstallmentReason("");
      window.dispatchEvent(new Event("ktx-payments-updated"));
      await load();
    } catch {
      setError("Không thể bật chế độ đóng theo tháng. Vui lòng thử lại.");
    }
  };

  const handleActivateDiscount = async () => {
    const percent = Number(discountValue);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      setError("Vui lòng nhập % giảm hợp lệ (0-100).");
      return;
    }
    setError("");
    try {
      await createStudentPaymentPlan(studentId, { type: "discount", discount_percent: percent, reason: discountReason || undefined });
      setDiscountValue("");
      setDiscountReason("");
      setShowDiscountForm(false);
      window.dispatchEvent(new Event("ktx-payments-updated"));
      await load();
    } catch {
      setError("Không thể bật chế độ giảm giá dài hạn. Vui lòng thử lại.");
    }
  };

  const handleDeactivate = async (planId: number) => {
    setError("");
    try {
      await deactivateStudentPaymentPlan(planId);
      window.dispatchEvent(new Event("ktx-payments-updated"));
      await load();
    } catch {
      setError("Không thể tắt chế độ này. Vui lòng thử lại.");
    }
  };

  return (
    <div className="fixed inset-0 z-[86] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.26, ease: "easeOut" }}
        className="w-full max-w-[600px] rounded-[26px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xl font-bold uppercase text-[#7d90b5]">Chế độ đặc biệt</p>
            <p className="mt-1 text-sm font-semibold text-[#5570a0]">{studentLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-sm font-semibold text-[#6f84ad]">Đang tải...</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-[#d3e0f2] bg-white/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.10em] text-[#6f84ad]">Đóng theo tháng</p>
              {activeInstallment ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">Đang bật{activeInstallment.reason ? ` · ${activeInstallment.reason}` : ""}</p>
                    {activeInstallment.activatedAt ? (
                      <p className="text-xs text-[#8598bd]">Từ {formatDate(activeInstallment.activatedAt)}</p>
                    ) : null}
                  </div>
                  <button type="button" onClick={() => void handleDeactivate(activeInstallment.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100">Tắt chế độ</button>
                </div>
              ) : (
                <div className="mt-2">
                  <input
                    value={installmentReason}
                    onChange={(e) => setInstallmentReason(e.target.value)}
                    placeholder="Lý do (vd: gia đình khó khăn — theo yêu cầu hỗ trợ #12)"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10"
                  />
                  <button type="button" onClick={() => void handleActivateInstallment()} className="mt-2 rounded-xl bg-[#244cb8] px-4 py-2 text-xs font-semibold text-white hover:brightness-110">Bật đóng theo tháng</button>
                  <p className="mt-1.5 text-xs text-[#8598bd]">Hóa đơn quý hiện có (nếu có) sẽ được tách thành 3 hóa đơn tháng.</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#d3e0f2] bg-white/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.10em] text-[#6f84ad]">Giảm giá dài hạn</p>
              {activeDiscount ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">
                      Đang giảm {activeDiscount.discountPercent}%{activeDiscount.reason ? ` · ${activeDiscount.reason}` : ""}
                    </p>
                    {activeDiscount.activatedAt ? (
                      <p className="text-xs text-[#8598bd]">Từ {formatDate(activeDiscount.activatedAt)}</p>
                    ) : null}
                  </div>
                  <button type="button" onClick={() => void handleDeactivate(activeDiscount.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100">Tắt chế độ</button>
                </div>
              ) : showDiscountForm ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input type="number" min={0} max={100} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="% giảm" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
                  <input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="Lý do" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
                  <div className="sm:col-span-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setShowDiscountForm(false)} className="rounded-xl border border-[#c8d8ef] bg-white px-4 py-2 text-xs font-semibold text-[#24407f]">Hủy</button>
                    <button type="button" onClick={() => void handleActivateDiscount()} className="rounded-xl bg-[#244cb8] px-4 py-2 text-xs font-semibold text-white hover:brightness-110">Bật giảm giá</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setShowDiscountForm(true)} className="mt-2 rounded-xl bg-[#244cb8] px-4 py-2 text-xs font-semibold text-white hover:brightness-110">Bật giảm giá dài hạn</button>
              )}
            </div>

            {history.length ? (
              <div className="rounded-2xl border border-[#d3e0f2] bg-white/50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.10em] text-[#6f84ad]">Lịch sử</p>
                <ul className="mt-2 space-y-1.5">
                  {history.map((plan) => (
                    <li key={plan.id} className="text-xs font-semibold text-[#8598bd]">
                      {typeLabel[plan.type]}{plan.type === "discount" && plan.discountPercent != null ? ` ${plan.discountPercent}%` : ""}
                      {plan.reason ? ` · ${plan.reason}` : ""}
                      {plan.deactivatedAt ? ` · tắt ${formatDate(plan.deactivatedAt)}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        {error ? <p className="mt-4 text-sm font-semibold text-[#cc3c4f]">{error}</p> : null}

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white">Đóng</button>
        </div>
      </motion.div>
    </div>
  );
}
