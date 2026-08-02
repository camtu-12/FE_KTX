import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { Plus, Trash2, X } from "lucide-react";
import {
  createPriorityCriteria,
  deletePriorityCriteria,
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
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCriteria, setNewCriteria] = useState({
    code: "",
    name: "",
    tier: "2",
    priorityScore: "0",
    discountPercent: "0",
    isActive: true,
  });
  const emptyFieldErrors = { code: "", name: "", tier: "", priorityScore: "", discountPercent: "" };
  const [fieldErrors, setFieldErrors] = useState(emptyFieldErrors);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const closeConfirm = () => {
    setIsConfirmOpen(false);
    setConfirmAction(null);
  };

  const confirmNow = () => {
    if (confirmAction) confirmAction();
    closeConfirm();
  };

  const openInfoModal = (message: string) => {
    setConfirmMessage(message);
    setConfirmAction(null);
    setIsConfirmOpen(true);
  };

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

  const extractErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
      return error.response.data.message;
    }
    return fallback;
  };

  const extractFieldError = (error: unknown, field: string): string | null => {
    if (axios.isAxiosError(error)) {
      const fieldErrors = error.response?.data?.errors?.[field];
      if (Array.isArray(fieldErrors) && typeof fieldErrors[0] === "string") {
        return fieldErrors[0];
      }
    }
    return null;
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setFieldErrors(emptyFieldErrors);
  };

  const CODE_FORMAT = /^UT\d+$/i;

  const handleCreate = async () => {
    const code = newCriteria.code.trim();
    const name = newCriteria.name.trim();
    const tier = Number(newCriteria.tier);
    const priorityScore = Number(newCriteria.priorityScore);
    const discountPercent = Number(newCriteria.discountPercent);

    const errors = { ...emptyFieldErrors };
    if (!code) {
      errors.code = "Vui lòng nhập mã tiêu chí.";
    } else if (!CODE_FORMAT.test(code)) {
      errors.code = "Mã tiêu chí phải có định dạng UT + số (VD: UT07).";
    }
    if (!name) {
      errors.name = "Vui lòng nhập tên tiêu chí.";
    }
    if (!Number.isInteger(tier) || tier < 1 || tier > 3) {
      errors.tier = "Vui lòng chọn bậc hợp lệ (1 - 3).";
    }
    if (newCriteria.priorityScore.trim() === "") {
      errors.priorityScore = "Vui lòng nhập điểm ưu tiên.";
    } else if (!Number.isInteger(priorityScore) || priorityScore < 0 || priorityScore > 100) {
      errors.priorityScore = "Điểm ưu tiên phải là số nguyên từ 0 đến 100.";
    }
    if (newCriteria.discountPercent.trim() === "") {
      errors.discountPercent = "Vui lòng nhập % giảm phí.";
    } else if (Number.isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      errors.discountPercent = "% giảm phí phải nằm trong khoảng 0 - 100.";
    }

    if (errors.code || errors.name || errors.tier || errors.priorityScore || errors.discountPercent) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors(emptyFieldErrors);

    setCreating(true);
    try {
      await createPriorityCriteria({
        code,
        name,
        tier,
        priority_score: priorityScore,
        discount_percent: discountPercent,
        is_active: newCriteria.isActive,
      });
      setNewCriteria({ code: "", name: "", tier: "2", priorityScore: "0", discountPercent: "0", isActive: true });
      setIsAddModalOpen(false);
      showToast("success", `Đã thêm tiêu chí "${name}".`);
      await loadPolicies();
    } catch (error) {
      const codeFieldError = extractFieldError(error, "code");
      if (codeFieldError) {
        setFieldErrors((prev) => ({
          ...prev,
          code:
            codeFieldError === "The code has already been taken."
              ? "Mã tiêu chí này đã tồn tại, vui lòng chọn mã khác."
              : codeFieldError,
        }));
      } else {
        showToast("error", extractErrorMessage(error, "Thêm tiêu chí thất bại. Vui lòng thử lại."));
      }
    } finally {
      setCreating(false);
    }
  };

  const runDelete = async (item: FeeDiscountPolicy) => {
    setDeletingId(item.priorityCriteriaId);
    try {
      await deletePriorityCriteria(item.priorityCriteriaId);
      showToast("success", `Đã xóa tiêu chí "${item.name}".`);
      await loadPolicies();
    } catch (error) {
      openInfoModal(extractErrorMessage(error, "Xóa thất bại. Vui lòng thử lại."));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (item: FeeDiscountPolicy) => {
    setConfirmMessage(`Xóa tiêu chí "${item.name}"? Hành động này không thể hoàn tác.`);
    setConfirmAction(() => () => runDelete(item));
    setIsConfirmOpen(true);
  };

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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">
              Chính sách giảm phí theo tiêu chí ưu tiên
            </h1>
            <p className="mt-1.5 text-sm text-[#5570a0]">
              Thiết lập % giảm phí nội trú áp dụng tự động cho từng tiêu chí ưu tiên khi tạo hóa đơn.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-[#244cb8] bg-[#244cb8] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            <Plus size={16} /> Thêm tiêu chí
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-[#d6e2f1] bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
              <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Mã</th>
              <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Tiêu chí ưu tiên</th>
              <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Bậc</th>
              <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Điểm ưu tiên</th>
              <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">% giảm phí</th>
              <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Áp dụng</th>
              <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Hành động</th>
              <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-[#7c8fb5]">
                  Đang tải...
                </td>
              </tr>
            ) : policies.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-[#7c8fb5]">
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
                    <td className="px-5 py-4 text-center text-sm text-[#61779d]">{item.priorityScore}</td>
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
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        disabled={deletingId === item.priorityCriteriaId}
                        onClick={() => handleDelete(item)}
                        title="Xóa tiêu chí"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isAddModalOpen
        ? createPortal(
            <div className="fixed inset-0 z-[72] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
                className="w-full max-w-[560px] rounded-[26px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-xl font-bold uppercase text-[#1a2d52]">Thêm tiêu chí ưu tiên</h2>
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                    aria-label="Đóng"
                    title="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Mã tiêu chí *</span>
                    <input
                      value={newCriteria.code}
                      onChange={(e) => {
                        setNewCriteria((v) => ({ ...v, code: e.target.value }));
                        setFieldErrors((prev) => ({ ...prev, code: "" }));
                      }}
                      placeholder="VD: UT07"
                      className={`mt-2 w-full rounded-xl border bg-[#f8fbff] px-3 py-2.5 text-sm font-semibold text-[#1f3152] outline-none focus:border-[#244cb8] ${
                        fieldErrors.code ? "border-rose-400" : "border-[#c8d8ef]"
                      }`}
                    />
                    {fieldErrors.code ? <p className="mt-1.5 text-xs font-semibold text-rose-500">{fieldErrors.code}</p> : null}
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Tên tiêu chí *</span>
                    <input
                      value={newCriteria.name}
                      onChange={(e) => {
                        setNewCriteria((v) => ({ ...v, name: e.target.value }));
                        setFieldErrors((prev) => ({ ...prev, name: "" }));
                      }}
                      placeholder="Tên tiêu chí ưu tiên"
                      className={`mt-2 w-full rounded-xl border bg-[#f8fbff] px-3 py-2.5 text-sm font-semibold text-[#1f3152] outline-none focus:border-[#244cb8] ${
                        fieldErrors.name ? "border-rose-400" : "border-[#c8d8ef]"
                      }`}
                    />
                    {fieldErrors.name ? <p className="mt-1.5 text-xs font-semibold text-rose-500">{fieldErrors.name}</p> : null}
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Bậc *</span>
                      <select
                        value={newCriteria.tier}
                        onChange={(e) => {
                          setNewCriteria((v) => ({ ...v, tier: e.target.value }));
                          setFieldErrors((prev) => ({ ...prev, tier: "" }));
                        }}
                        className={`mt-2 w-full rounded-xl border bg-[#f8fbff] px-3 py-2.5 text-sm font-semibold text-[#1f3152] outline-none focus:border-[#244cb8] ${
                          fieldErrors.tier ? "border-rose-400" : "border-[#c8d8ef]"
                        }`}
                      >
                        <option value="1">Bậc 1</option>
                        <option value="2">Bậc 2</option>
                        <option value="3">Bậc 3</option>
                      </select>
                      {fieldErrors.tier ? <p className="mt-1.5 text-xs font-semibold text-rose-500">{fieldErrors.tier}</p> : null}
                    </label>

                    <label className="block">
                      <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Điểm ưu tiên *</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={newCriteria.priorityScore}
                        onChange={(e) => {
                          setNewCriteria((v) => ({ ...v, priorityScore: e.target.value }));
                          setFieldErrors((prev) => ({ ...prev, priorityScore: "" }));
                        }}
                        placeholder="0"
                        className={`mt-2 w-full rounded-xl border bg-[#f8fbff] px-3 py-2.5 text-sm font-semibold text-[#1f3152] outline-none focus:border-[#244cb8] ${
                          fieldErrors.priorityScore ? "border-rose-400" : "border-[#c8d8ef]"
                        }`}
                      />
                      {fieldErrors.priorityScore ? (
                        <p className="mt-1.5 text-xs font-semibold text-rose-500">{fieldErrors.priorityScore}</p>
                      ) : null}
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">% giảm phí *</span>
                      <div
                        className={`mt-2 flex items-center gap-1 rounded-xl border bg-[#f8fbff] px-3 py-2.5 ${
                          fieldErrors.discountPercent ? "border-rose-400" : "border-[#c8d8ef]"
                        }`}
                      >
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={newCriteria.discountPercent}
                          onChange={(e) => {
                            setNewCriteria((v) => ({ ...v, discountPercent: e.target.value }));
                            setFieldErrors((prev) => ({ ...prev, discountPercent: "" }));
                          }}
                          placeholder="0"
                          className="w-full bg-transparent text-sm font-semibold text-[#1f3152] outline-none"
                        />
                        <span className="text-sm text-[#7c8fb5]">%</span>
                      </div>
                      {fieldErrors.discountPercent ? (
                        <p className="mt-1.5 text-xs font-semibold text-rose-500">{fieldErrors.discountPercent}</p>
                      ) : null}
                    </label>

                    <div className="block">
                      <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Áp dụng</span>
                      <div className="mt-2 flex h-[46px] items-center">
                        <button
                          type="button"
                          onClick={() => setNewCriteria((v) => ({ ...v, isActive: !v.isActive }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            newCriteria.isActive ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                          aria-pressed={newCriteria.isActive}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                              newCriteria.isActive ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={creating}
                    onClick={handleCreate}
                    className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="auth-btn-gloss__content">{creating ? "Đang thêm..." : "Lưu tiêu chí mới"}</span>
                  </button>
                </div>
              </motion.div>
            </div>,
            document.body,
          )
        : null}

      {isConfirmOpen
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/30" onClick={closeConfirm} />
              <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
                <p className="text-sm text-slate-700">{confirmMessage}</p>
                <div className="mt-4 flex justify-end gap-3">
                  {confirmAction ? (
                    <>
                      <button type="button" onClick={closeConfirm} className="rounded-xl border px-3 py-2 text-sm">
                        Hủy
                      </button>
                      <button type="button" onClick={confirmNow} className="rounded-xl bg-red-600 px-3 py-2 text-sm text-white">
                        OK
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={closeConfirm} className="rounded-xl bg-slate-200 px-3 py-2 text-sm text-slate-700">
                      Đóng
                    </button>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </motion.div>
  );
}
