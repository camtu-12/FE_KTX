import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  getFeeDiscountPolicies,
  updateFeeDiscountPolicy,
  type FeeDiscountPolicy,
} from "../../../api/feeDiscountApi";

type ToastState = { type: "success" | "error"; message: string };

type RowDraft = {
  discountPercent: string;
  isActive: boolean;
};

const TIER_LABELS: Record<number, string> = {
  1: "Bậc 1",
  2: "Bậc 2",
  3: "Bậc 3",
};

export default function AdminFeeDiscountPage() {
  const [policies, setPolicies] = useState<FeeDiscountPolicy[]>([]);
  const [drafts, setDrafts] = useState<Record<number, RowDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const syncDrafts = (items: FeeDiscountPolicy[]) => {
    setDrafts(
      Object.fromEntries(
        items.map((item) => [
          item.priorityCriteriaId,
          { discountPercent: String(item.discountPercent), isActive: item.isActive },
        ]),
      ),
    );
  };

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const items = await getFeeDiscountPolicies();
      setPolicies(items);
      syncDrafts(items);
    } catch {
      showToast("error", "Không thể tải danh sách chính sách giảm phí.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const isRowDirty = (item: FeeDiscountPolicy) => {
    const draft = drafts[item.priorityCriteriaId];
    if (!draft) return false;
    return (
      draft.discountPercent !== String(item.discountPercent) ||
      draft.isActive !== item.isActive
    );
  };

  const handleSave = async (item: FeeDiscountPolicy) => {
    const draft = drafts[item.priorityCriteriaId];
    if (!draft) return;

    const percent = Number(draft.discountPercent);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      showToast("error", "Phần trăm giảm phải nằm trong khoảng 0 - 100.");
      return;
    }

    setSavingId(item.priorityCriteriaId);
    try {
      const updated = await updateFeeDiscountPolicy(item.priorityCriteriaId, {
        discount_percent: percent,
        is_active: draft.isActive,
      });
      setPolicies((prev) =>
        prev.map((p) => (p.priorityCriteriaId === updated.priorityCriteriaId ? updated : p)),
      );
      setDrafts((prev) => ({
        ...prev,
        [updated.priorityCriteriaId]: {
          discountPercent: String(updated.discountPercent),
          isActive: updated.isActive,
        },
      }));
      showToast("success", `Đã lưu chính sách giảm phí cho "${updated.name}".`);
    } catch {
      showToast("error", "Lưu thất bại, vui lòng thử lại.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      {toast &&
        createPortal(
          <div
            className={`fixed top-5 right-5 z-[9999] rounded-xl px-5 py-3 text-sm font-medium shadow-lg ${
              toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {toast.message}
          </div>,
          document.body,
        )}

      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:px-8">
        <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">
          Chính sách giảm phí theo tiêu chí ưu tiên
        </h1>
        <p className="mt-1.5 text-sm text-[#5570a0]">
          Thiết lập % giảm phí nội trú áp dụng tự động cho từng tiêu chí ưu tiên khi tạo hóa đơn.
        </p>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-[#d6e2f1] bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
              <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Mã</th>
              <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Tiêu chí ưu tiên</th>
              <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Bậc</th>
              <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">% giảm phí</th>
              <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Áp dụng</th>
              <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#7c8fb5]">
                  Đang tải...
                </td>
              </tr>
            ) : policies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#7c8fb5]">
                  Chưa có tiêu chí ưu tiên nào.
                </td>
              </tr>
            ) : (
              policies.map((item) => {
                const draft = drafts[item.priorityCriteriaId] ?? {
                  discountPercent: String(item.discountPercent),
                  isActive: item.isActive,
                };
                const dirty = isRowDirty(item);
                const saving = savingId === item.priorityCriteriaId;

                return (
                  <tr key={item.priorityCriteriaId} className="border-t border-[#eef3fb]">
                    <td className="px-5 py-4 text-sm font-semibold text-[#1f3152]">{item.code}</td>
                    <td className="px-5 py-4 text-sm text-[#1f3152]">{item.name}</td>
                    <td className="px-5 py-4 text-center text-sm text-[#61779d]">
                      {TIER_LABELS[item.tier] ?? item.tier}
                    </td>
                    <td className="px-5 py-4">
                      <div className="mx-auto flex w-24 items-center gap-1 rounded-xl border border-[#c8d8ef] bg-[#f8fbff] px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={draft.discountPercent}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [item.priorityCriteriaId]: { ...draft, discountPercent: e.target.value },
                            }))
                          }
                          className="w-full bg-transparent text-right text-sm font-bold text-[#1a2d52] outline-none"
                        />
                        <span className="text-sm text-[#7c8fb5]">%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.priorityCriteriaId]: { ...draft, isActive: !draft.isActive },
                          }))
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          draft.isActive ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                        aria-pressed={draft.isActive}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                            draft.isActive ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        disabled={!dirty || saving}
                        onClick={() => handleSave(item)}
                        className="rounded-xl border border-[#244cb8] bg-[#244cb8] px-4 py-2 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:border-[#c8d8ef] disabled:bg-[#c8d8ef] disabled:text-white"
                      >
                        {saving ? "Đang lưu..." : "Lưu"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
