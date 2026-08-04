import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { CheckCircle2, Pencil, Plus, Trash2, X, XCircle } from "lucide-react";
import {
  createPriorityCriteria,
  deletePriorityCriteria,
  getFeeDiscountPolicies,
  updatePriorityCriteria,
  type FeeDiscountPolicy,
} from "../../../api/feeDiscountApi";

type ToastState = { type: "success" | "error"; message: string };

const TIER_LABELS: Record<number, string> = {
  1: "Bậc 1",
  2: "Bậc 2",
  3: "Bậc 3",
};

export default function AdminFeeDiscountPage() {
  const [policies, setPolicies] = useState<FeeDiscountPolicy[]>([]);
  const [loading, setLoading] = useState(true);
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
  });
  const emptyFieldErrors = { code: "", name: "", tier: "", priorityScore: "", discountPercent: "" };
  const [fieldErrors, setFieldErrors] = useState(emptyFieldErrors);

  const [editingItem, setEditingItem] = useState<FeeDiscountPolicy | null>(null);
  const [editForm, setEditForm] = useState({
    code: "",
    name: "",
    tier: "2",
    priorityScore: "0",
    discountPercent: "0",
  });
  const [editFieldErrors, setEditFieldErrors] = useState(emptyFieldErrors);
  const [updating, setUpdating] = useState(false);

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

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const items = await getFeeDiscountPolicies();
      setPolicies(items);
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
      });
      setNewCriteria({ code: "", name: "", tier: "2", priorityScore: "0", discountPercent: "0" });
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

  const openEditModal = (item: FeeDiscountPolicy) => {
    setEditingItem(item);
    setEditForm({
      code: item.code,
      name: item.name,
      tier: String(item.tier),
      priorityScore: String(item.priorityScore),
      discountPercent: String(item.discountPercent),
    });
    setEditFieldErrors(emptyFieldErrors);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditFieldErrors(emptyFieldErrors);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;

    const code = editForm.code.trim();
    const name = editForm.name.trim();
    const tier = Number(editForm.tier);
    const priorityScore = Number(editForm.priorityScore);
    const discountPercent = Number(editForm.discountPercent);

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
    if (editForm.priorityScore.trim() === "") {
      errors.priorityScore = "Vui lòng nhập điểm ưu tiên.";
    } else if (!Number.isInteger(priorityScore) || priorityScore < 0 || priorityScore > 100) {
      errors.priorityScore = "Điểm ưu tiên phải là số nguyên từ 0 đến 100.";
    }
    if (editForm.discountPercent.trim() === "") {
      errors.discountPercent = "Vui lòng nhập % giảm phí.";
    } else if (Number.isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      errors.discountPercent = "% giảm phí phải nằm trong khoảng 0 - 100.";
    }

    if (errors.code || errors.name || errors.tier || errors.priorityScore || errors.discountPercent) {
      setEditFieldErrors(errors);
      return;
    }
    setEditFieldErrors(emptyFieldErrors);

    setUpdating(true);
    try {
      const updated = await updatePriorityCriteria(editingItem.priorityCriteriaId, {
        code,
        name,
        tier,
        priority_score: priorityScore,
        discount_percent: discountPercent,
      });
      showToast("success", `Đã cập nhật tiêu chí "${updated.name}".`);
      closeEditModal();
      await loadPolicies();
    } catch (error) {
      const codeFieldError = extractFieldError(error, "code");
      if (codeFieldError) {
        setEditFieldErrors((prev) => ({
          ...prev,
          code:
            codeFieldError === "The code has already been taken."
              ? "Mã tiêu chí này đã tồn tại, vui lòng chọn mã khác."
              : codeFieldError,
        }));
      } else {
        showToast("error", extractErrorMessage(error, "Cập nhật thất bại. Vui lòng thử lại."));
      }
    } finally {
      setUpdating(false);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      {createPortal(
        <AnimatePresence>
          {toast && (
            <div className="fixed inset-0 z-90 flex items-center justify-center bg-[rgba(14,25,48,0.35)] px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`flex items-center gap-3 rounded-[20px] border bg-white px-6 py-4 text-sm font-semibold shadow-[0_24px_60px_rgba(15,23,42,0.25)] ${
                  toast.type === "success" ? "border-emerald-200 text-emerald-700" : "border-rose-200 text-rose-700"
                }`}
              >
                {toast.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
                {toast.message}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
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
                return (
                  <tr key={item.priorityCriteriaId} className="border-t border-[#eef3fb]">
                    <td className="px-5 py-4 text-sm font-semibold text-[#1f3152]">{item.code}</td>
                    <td className="px-5 py-4 text-sm text-[#1f3152]">{item.name}</td>
                    <td className="px-5 py-4 text-center text-sm text-[#61779d]">
                      {TIER_LABELS[item.tier] ?? item.tier}
                    </td>
                    <td className="px-5 py-4 text-center text-sm text-[#61779d]">{item.priorityScore}</td>
                    <td className="px-5 py-4 text-center text-sm font-bold text-[#1a2d52]">
                      {item.discountPercent}%
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          title="Sửa tiêu chí"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#6f84ad] transition hover:bg-[#eef3ff] hover:text-[#244cb8]"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === item.priorityCriteriaId}
                          onClick={() => handleDelete(item)}
                          title="Xóa tiêu chí"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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

      {editingItem
        ? createPortal(
            <div className="fixed inset-0 z-[72] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
                className="w-full max-w-[560px] rounded-[26px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-xl font-bold uppercase text-[#1a2d52]">Sửa tiêu chí ưu tiên</h2>
                  <button
                    type="button"
                    onClick={closeEditModal}
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
                      value={editForm.code}
                      readOnly={editingItem?.inUse}
                      onChange={(e) => {
                        if (editingItem?.inUse) return;
                        setEditForm((v) => ({ ...v, code: e.target.value }));
                        setEditFieldErrors((prev) => ({ ...prev, code: "" }));
                      }}
                      placeholder="VD: UT07"
                      className={`mt-2 w-full rounded-xl border bg-[#f8fbff] px-3 py-2.5 text-sm font-semibold text-[#1f3152] outline-none focus:border-[#244cb8] ${
                        editingItem?.inUse ? "cursor-not-allowed opacity-70" : ""
                      } ${editFieldErrors.code ? "border-rose-400" : "border-[#c8d8ef]"}`}
                    />
                    {editFieldErrors.code ? <p className="mt-1.5 text-xs font-semibold text-rose-500">{editFieldErrors.code}</p> : null}
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Tên tiêu chí *</span>
                    <input
                      value={editForm.name}
                      onChange={(e) => {
                        setEditForm((v) => ({ ...v, name: e.target.value }));
                        setEditFieldErrors((prev) => ({ ...prev, name: "" }));
                      }}
                      placeholder="Tên tiêu chí ưu tiên"
                      className={`mt-2 w-full rounded-xl border bg-[#f8fbff] px-3 py-2.5 text-sm font-semibold text-[#1f3152] outline-none focus:border-[#244cb8] ${
                        editFieldErrors.name ? "border-rose-400" : "border-[#c8d8ef]"
                      }`}
                    />
                    {editFieldErrors.name ? <p className="mt-1.5 text-xs font-semibold text-rose-500">{editFieldErrors.name}</p> : null}
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Bậc *</span>
                      <select
                        value={editForm.tier}
                        onChange={(e) => {
                          setEditForm((v) => ({ ...v, tier: e.target.value }));
                          setEditFieldErrors((prev) => ({ ...prev, tier: "" }));
                        }}
                        className={`mt-2 w-full rounded-xl border bg-[#f8fbff] px-3 py-2.5 text-sm font-semibold text-[#1f3152] outline-none focus:border-[#244cb8] ${
                          editFieldErrors.tier ? "border-rose-400" : "border-[#c8d8ef]"
                        }`}
                      >
                        <option value="1">Bậc 1</option>
                        <option value="2">Bậc 2</option>
                        <option value="3">Bậc 3</option>
                      </select>
                      {editFieldErrors.tier ? <p className="mt-1.5 text-xs font-semibold text-rose-500">{editFieldErrors.tier}</p> : null}
                    </label>

                    <label className="block">
                      <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Điểm ưu tiên *</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editForm.priorityScore}
                        onChange={(e) => {
                          setEditForm((v) => ({ ...v, priorityScore: e.target.value }));
                          setEditFieldErrors((prev) => ({ ...prev, priorityScore: "" }));
                        }}
                        placeholder="0"
                        className={`mt-2 w-full rounded-xl border bg-[#f8fbff] px-3 py-2.5 text-sm font-semibold text-[#1f3152] outline-none focus:border-[#244cb8] ${
                          editFieldErrors.priorityScore ? "border-rose-400" : "border-[#c8d8ef]"
                        }`}
                      />
                      {editFieldErrors.priorityScore ? (
                        <p className="mt-1.5 text-xs font-semibold text-rose-500">{editFieldErrors.priorityScore}</p>
                      ) : null}
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">% giảm phí *</span>
                    <div
                      className={`mt-2 flex items-center gap-1 rounded-xl border bg-[#f8fbff] px-3 py-2.5 ${
                        editFieldErrors.discountPercent ? "border-rose-400" : "border-[#c8d8ef]"
                      }`}
                    >
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={editForm.discountPercent}
                        onChange={(e) => {
                          setEditForm((v) => ({ ...v, discountPercent: e.target.value }));
                          setEditFieldErrors((prev) => ({ ...prev, discountPercent: "" }));
                        }}
                        placeholder="0"
                        className="w-full bg-transparent text-sm font-semibold text-[#1f3152] outline-none"
                      />
                      <span className="text-sm text-[#7c8fb5]">%</span>
                    </div>
                    {editFieldErrors.discountPercent ? (
                      <p className="mt-1.5 text-xs font-semibold text-rose-500">{editFieldErrors.discountPercent}</p>
                    ) : null}
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={handleUpdate}
                    className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="auth-btn-gloss__content">{updating ? "Đang lưu..." : "Lưu thay đổi"}</span>
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
