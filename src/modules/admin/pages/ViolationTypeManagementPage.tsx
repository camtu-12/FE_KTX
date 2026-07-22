import { motion } from "framer-motion";
import { Funnel, Pencil, Plus, Trash2, X } from "lucide-react";
import type { FormEvent, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { listViolations } from "../../../api/violationApi";
import {
  createViolationType,
  deleteViolationType,
  listViolationTypes,
  updateViolationType,
  ViolationTypeApiError,
} from "../../../api/violationTypeApi";
import type { ActivityCategory, ViolationLevel, ViolationType } from "../../../api/violationTypeApi";

type ViolationTypeForm = {
  name: string;
  category: ActivityCategory;
  level: ViolationLevel;
  points: string;
  description: string;
};

type CategoryFilter = ActivityCategory | "all";

const initialFormState: ViolationTypeForm = {
  name: "",
  category: "negative",
  level: "MINOR",
  points: "0",
  description: "",
};

const levelOptions: Array<{ value: ViolationLevel; label: string }> = [
  { value: "MINOR", label: "Nhẹ" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "SERIOUS", label: "Nghiêm trọng" },
];

const levelMeta: Record<ViolationLevel, { label: string; badgeClassName: string }> = {
  MINOR: {
    label: "Nhẹ",
    badgeClassName: "border border-yellow-200 bg-yellow-50 text-yellow-700",
  },
  MEDIUM: {
    label: "Trung bình",
    badgeClassName: "border border-orange-200 bg-orange-50 text-orange-700",
  },
  SERIOUS: {
    label: "Nghiêm trọng",
    badgeClassName: "border border-red-200 bg-red-50 text-red-700",
  },
};

const categoryMeta: Record<ActivityCategory, { label: string; badgeClassName: string }> = {
  positive: {
    label: "Hoạt động tích cực",
    badgeClassName: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  negative: {
    label: "Vi phạm",
    badgeClassName: "border border-rose-200 bg-rose-50 text-rose-700",
  },
};

function Badge({ children, className }: { children: string; className: string }) {
  return (
    <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

function InputField(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10 ${props.className ?? ""}`}
    />
  );
}

function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10 ${props.className ?? ""}`}
    />
  );
}

function TextareaField(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10 ${props.className ?? ""}`}
    />
  );
}

export default function ViolationTypeManagementPage() {
  const [items, setItems] = useState<ViolationType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ViolationType | null>(null);
  const [form, setForm] = useState<ViolationTypeForm>(initialFormState);
  const [formError, setFormError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [levelFilter, setLevelFilter] = useState<CategoryFilter>("all");
  const [draftLevelFilter, setDraftLevelFilter] = useState<CategoryFilter>("all");
  const [isLevelFilterOpen, setIsLevelFilterOpen] = useState(false);
  const [levelFilterMenuPosition, setLevelFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const levelFilterButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadViolationTypes = async () => {
      try {
        const data = await listViolationTypes();
        if (mounted) {
          setItems(data);
        }
      } catch {
        if (mounted) {
          setItems([]);
        }
      }
    };

    void loadViolationTypes();

    if (typeof window !== "undefined") {
      window.addEventListener("ktx-violation-types-updated", loadViolationTypes);
      window.addEventListener("focus", loadViolationTypes);
    }

    return () => {
      mounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("ktx-violation-types-updated", loadViolationTypes);
        window.removeEventListener("focus", loadViolationTypes);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLevelFilterOpen) return;

    const updateMenuPosition = () => {
      const buttonRect = levelFilterButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;

      setLevelFilterMenuPosition({
        top: buttonRect.bottom + 10,
        left: buttonRect.left + buttonRect.width / 2,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isLevelFilterOpen]);

  useEffect(() => {
    if (!successMessage) return;

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage("");
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const sortedItems = useMemo(
    () => items.filter((item) => levelFilter === "all" || item.category === levelFilter).sort((a, b) => a.id - b.id),
    [items, levelFilter],
  );

  const openAddModal = () => {
    setEditingType(null);
    setForm(initialFormState);
    setFormError("");
    setPageMessage("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: ViolationType) => {
    setEditingType(item);
    setForm({
      name: item.name,
      category: item.category,
      level: item.level,
      points: String(item.points),
      description: item.description,
    });
    setFormError("");
    setPageMessage("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingType(null);
    setForm(initialFormState);
    setFormError("");
  };

  const showSuccessMessage = (message: string) => {
    setSuccessMessage("");
    window.setTimeout(() => setSuccessMessage(message), 0);
  };

  const showConfirm = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setIsConfirmOpen(true);
  };

  const closeConfirm = () => {
    setIsConfirmOpen(false);
    setConfirmMessage("");
    setConfirmAction(null);
  };

  const confirmNow = () => {
    if (confirmAction) confirmAction();
    closeConfirm();
  };

  const openLevelFilter = () => {
    setDraftLevelFilter(levelFilter);
    setIsLevelFilterOpen(true);
  };

  const resetLevelFilter = () => {
    setDraftLevelFilter("all");
    setLevelFilter("all");
    setIsLevelFilterOpen(false);
  };

  const applyLevelFilter = () => {
    setLevelFilter(draftLevelFilter);
    setIsLevelFilterOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = form.name.trim();
    const trimmedDescription = form.description.trim();

    if (!trimmedName) {
      setFormError("Vui lòng nhập tên hoạt động.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const payload = {
        name: trimmedName,
        category: form.category,
        level: form.category === "negative" ? form.level : undefined,
        points: Number(form.points) || 0,
        description: trimmedDescription,
      } as const;
      const isEditing = !!editingType;

      if (isEditing && editingType) {
        const updatedType = await updateViolationType(editingType.id, payload);
        setItems((current) => current.map((item) => (item.id === updatedType.id ? updatedType : item)));
      } else {
        const createdType = await createViolationType(payload);
        setItems((current) => [...current, createdType]);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ktx-violation-types-updated"));
      }

      setPageMessage("");
      showSuccessMessage(isEditing ? "Cập nhật hoạt động thành công." : "Thêm hoạt động thành công.");
      closeModal();
    } catch {
      setFormError("Không thể lưu hoạt động. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteType = async (item: ViolationType) => {
    setPageMessage("");

    try {
      await deleteViolationType(item.id);
      setItems((current) => current.filter((type) => type.id !== item.id));
      showSuccessMessage("Xóa hoạt động thành công.");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ktx-violation-types-updated"));
      }
    } catch (error) {
      if (error instanceof ViolationTypeApiError && error.status === 404) {
        setItems((current) => current.filter((type) => type.id !== item.id));
        showSuccessMessage("Xóa hoạt động thành công.");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("ktx-violation-types-updated"));
        }
        return;
      }

      try {
        const latestItems = await listViolationTypes();
        setItems(latestItems);

        if (!latestItems.some((type) => type.id === item.id)) {
          showSuccessMessage("Xóa hoạt động thành công.");
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("ktx-violation-types-updated"));
          }
          return;
        }

        if (!(error instanceof ViolationTypeApiError && error.status === 422)) {
          setPageMessage(`Không thể xóa "${item.name}". Vui lòng thử lại.`);
          return;
        }
      } catch {
        if (!(error instanceof ViolationTypeApiError && error.status === 422)) {
          setPageMessage(`Không thể kiểm tra kết quả xóa "${item.name}". Vui lòng tải lại trang.`);
          return;
        }
      }

      setPageMessage(`Không thể xóa "${item.name}" vì hoạt động này đã được ghi nhận.`);
    }
  };

  const removeType = async (item: ViolationType) => {
    setPageMessage("");

    try {
      const currentViolations = await listViolations();
      if (currentViolations.some((violation) => violation.typeId === item.id)) {
        showConfirm(`Không thể xóa ${item.name} vì hoạt động này đã được ghi nhận.`, () => {});
        return;
      }
    } catch {
      showConfirm(`Không thể kiểm tra hoạt động ${item.name}. Vui lòng thử lại.`, () => {});
      return;
    }

    showConfirm(`Bạn có chắc muốn xóa hoạt động ${item.name} không?`, () => {
      void deleteType(item);
    });
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex min-h-full flex-col gap-6 rounded-[28px] border border-[#cfdbef] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:p-6"
      >
        <header className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Danh mục hoạt động</h1>
              <p className="mt-1 text-sm text-[#62789f]">Quản lý hoạt động tích cực, vi phạm, mức độ và điểm.</p>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(36,76,184,0.28)] transition hover:-translate-y-0.5 hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              Thêm hoạt động
            </button>
          </div>
        </header>

        {pageMessage ? (
          <div className="rounded-2xl border border-[#d3e0f2] bg-white/75 px-4 py-3 text-sm font-semibold text-[#1b3766] shadow-[0_10px_22px_rgba(36,76,184,0.08)]">
            {pageMessage}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[22px] border border-[#d6e2f1] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-separate border-spacing-0">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[30%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                  {["Tên hoạt động", "Mô tả", "Phân loại", "Mức độ", "Điểm", "Hành động"].map((heading, headingIndex) => (
                    <th key={heading} className="px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                      {headingIndex === 2 ? (
                        <div className="inline-flex items-center justify-center gap-2">
                          <span>{heading}</span>
                          <button
                            ref={levelFilterButtonRef}
                            type="button"
                            onClick={isLevelFilterOpen ? () => setIsLevelFilterOpen(false) : openLevelFilter}
                            className={`flex items-center justify-center transition ${levelFilter !== "all" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"}`}
                            aria-label="Bộ lọc phân loại"
                            title="Bộ lọc phân loại"
                          >
                            <Funnel className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        heading
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id} className="transition duration-200 hover:bg-[#f8fbff]">
                    <td className="border-t border-[#e8eef8] px-4 py-4 text-center text-sm font-medium text-[#1f3152]">
                      {item.name}
                    </td>
                    <td className="border-t border-[#e8eef8] px-4 py-4 text-center text-sm leading-6 text-[#1f3152]">
                      <span className="line-clamp-2">{item.description || "-"}</span>
                    </td>
                    <td className="whitespace-nowrap border-t border-[#e8eef8] px-4 py-4 text-center text-sm text-[#1f3152]">
                      {categoryMeta[item.category].label}
                    </td>
                    <td className="border-t border-[#e8eef8] px-4 py-4 text-center">
                      {item.category === "negative" ? (
                        <Badge className={levelMeta[item.level].badgeClassName}>{levelMeta[item.level].label}</Badge>
                      ) : (
                        <span className="text-sm font-semibold text-[#8a9abb]">-</span>
                      )}
                    </td>
                    <td className="border-t border-[#e8eef8] px-4 py-4 text-center text-sm font-bold text-[#1f3152]">
                      {item.points}
                    </td>
                    <td className="border-t border-[#e8eef8] px-4 py-4 text-center">
                      <div className="flex flex-nowrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[#bfd2ec] bg-[#f7fbff] text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition hover:-translate-y-0.5 hover:border-[#9ebce5] hover:bg-white"
                          aria-label="Sửa"
                          title="Sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeType(item)}
                          className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 shadow-[0_8px_18px_rgba(190,24,93,0.10)] transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-white"
                          aria-label="Xóa"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.section>

      {isModalOpen
        ? createPortal(
            <div className="fixed inset-0 z-[72] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
                className="w-full max-w-[620px] rounded-[26px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {editingType ? (
                    <p className="text-xl font-bold uppercase ">
                      {editingType ? "Cập nhật hoạt động" : "Thêm hoạt động"}
                    </p>
                    ) : null}
                    <div className={editingType ? "hidden" : undefined}>
                    <h2 className="mt-1 text-2xl uppercase font-bold ">
                      {editingType ? editingType.name : "Hoạt động mới"}
                    </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                    aria-label="Đóng"
                    title="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-2 space-y-4">
                    <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Tên hoạt động *</span>
                    <InputField
                      value={form.name}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, name: event.target.value }));
                        setFormError("");
                      }}
                      className="mt-2"
                      placeholder="Nhập tên hoạt động"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Phân loại *</span>
                      <SelectField
                        value={form.category}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            category: event.target.value as ActivityCategory,
                          }))
                        }
                        className="mt-2"
                      >
                        <option value="positive">Hoạt động tích cực</option>
                        <option value="negative">Vi phạm</option>
                      </SelectField>
                    </label>

                    <label className="block">
                      <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Điểm *</span>
                      <InputField
                        type="number"
                        value={form.points}
                        onChange={(event) => setForm((current) => ({ ...current, points: event.target.value }))}
                        className="mt-2"
                        placeholder="0"
                      />
                    </label>

                    {form.category === "negative" ? (
                    <label className="block sm:col-span-2">
                      <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Mức độ *</span>
                      <SelectField
                        value={form.level}
                        onChange={(event) => setForm((current) => ({ ...current, level: event.target.value as ViolationLevel }))}
                        className="mt-2"
                      >
                        {levelOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </SelectField>
                    </label>
                    ) : null}
                  </div>

                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Mô tả</span>
                    <TextareaField
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      rows={4}
                      className="mt-2"
                      placeholder="Nhập mô tả"
                    />
                  </label>

                  {formError ? <p className="text-sm font-semibold text-[#cc3c4f]">{formError}</p> : null}

                  <div className="flex flex-wrap justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
                    >
                      <span className="auth-btn-gloss__content">Lưu</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>,
            document.body,
          )
        : null}

      {successMessage
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 sm:items-center">
              <div className="absolute inset-0 bg-black/30" />
              <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
                <p className="text-sm text-slate-700">{successMessage}</p>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isLevelFilterOpen && levelFilterMenuPosition
        ? createPortal(
            <div className="fixed inset-0 z-[68]" onClick={() => setIsLevelFilterOpen(false)}>
              <div
                className="absolute w-[210px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
                style={{ top: levelFilterMenuPosition.top, left: levelFilterMenuPosition.left }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-0.5 p-2.5">
                  {[
                    { value: "all", label: "Tất cả" },
                    { value: "positive", label: "Hoạt động tích cực" },
                    { value: "negative", label: "Vi phạm" },
                  ].map((option) => {
                    const selected = draftLevelFilter === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDraftLevelFilter(option.value as CategoryFilter)}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected ? "border-[#244cb8] bg-[#244cb8]/10" : "border-[#cfd9e8] bg-white"}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${selected ? "bg-[#244cb8]" : "bg-transparent"}`} />
                        </span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between border-t border-[#dbe5f3] px-2.5 py-2">
                  <button type="button" onClick={resetLevelFilter} className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]">
                    Reset
                  </button>
                  <button type="button" onClick={applyLevelFilter} className="rounded-xl bg-[#0c4f97] px-3 py-1.5 text-[10px] font-semibold tracking-normal text-white shadow-[0_8px_16px_rgba(12,79,151,0.22)] transition hover:brightness-110">
                    OK
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isConfirmOpen
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 sm:items-center">
              <div className="absolute inset-0 bg-black/30" onClick={closeConfirm} />
              <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
                <p className="text-sm text-slate-700">{confirmMessage}</p>
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeConfirm}
                    className="rounded-xl border px-3 py-2 text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={confirmNow}
                    className="rounded-xl bg-red-600 px-3 py-2 text-sm text-white"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
