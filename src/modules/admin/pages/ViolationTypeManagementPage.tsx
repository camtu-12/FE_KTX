import { motion } from "framer-motion";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { FormEvent, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  createViolationType,
  deleteViolationType,
  listViolationTypes,
  updateViolationType,
  ViolationTypeApiError,
} from "../../../api/violationTypeApi";
import type { ViolationLevel, ViolationType } from "../../../api/violationTypeApi";

type ViolationTypeForm = {
  name: string;
  level: ViolationLevel;
  description: string;
};

const initialFormState: ViolationTypeForm = {
  name: "",
  level: "MINOR",
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

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.id - b.id), [items]);

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
      level: item.level,
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = form.name.trim();
    const trimmedDescription = form.description.trim();

    if (!trimmedName) {
      setFormError("Vui lòng nhập tên loại vi phạm.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const payload = {
        name: trimmedName,
        level: form.level,
        description: trimmedDescription,
      } as const;

      if (editingType) {
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
      closeModal();
    } catch {
      setFormError("KhÃ´ng thá»ƒ lÆ°u loáº¡i vi pháº¡m. Vui lÃ²ng thá»­ láº¡i.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeType = async (item: ViolationType) => {
    setPageMessage("");

    try {
      await deleteViolationType(item.id);
      setItems((current) => current.filter((type) => type.id !== item.id));
      setPageMessage(`Đã xóa loại vi phạm "${item.name}".`);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ktx-violation-types-updated"));
      }
    } catch (error) {
      if (error instanceof ViolationTypeApiError && error.status === 404) {
        setItems((current) => current.filter((type) => type.id !== item.id));
        setPageMessage(`Đã xóa loại vi phạm "${item.name}".`);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("ktx-violation-types-updated"));
        }
        return;
      }

      try {
        const latestItems = await listViolationTypes();
        setItems(latestItems);

        if (!latestItems.some((type) => type.id === item.id)) {
          setPageMessage(`Đã xóa loại vi phạm "${item.name}".`);
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

      setPageMessage(`Không thể xóa "${item.name}" vì đã có sinh viên vi phạm loại này.`);
    }
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
              <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Loại vi phạm</h1>
              <p className="mt-1 text-sm text-[#62789f]">Quản lý danh mục loại vi phạm và mức độ.</p>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(36,76,184,0.28)] transition hover:-translate-y-0.5 hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              Thêm loại vi phạm
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
                <col className="w-[22%]" />
                <col className="w-[48%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                  {["Tên loại", "Mô tả", "Mức độ", "Hành động"].map((heading) => (
                    <th key={heading} className="px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id} className="transition duration-200 hover:bg-[#f8fbff]">
                    <td className="border-t border-[#e8eef8] py-4 pl-10 pr-4 text-sm font-bold text-[#1f3152]">
                      {item.name}
                    </td>
                    <td className="border-t border-[#e8eef8] px-4 py-4 text-sm font-medium leading-6 text-[#5d7299]">
                      <span className="line-clamp-2">{item.description || "-"}</span>
                    </td>
                    <td className="border-t border-[#e8eef8] px-4 py-4">
                      <Badge className={levelMeta[item.level].badgeClassName}>{levelMeta[item.level].label}</Badge>
                    </td>
                    <td className="border-t border-[#e8eef8] px-4 py-4">
                      <div className="flex flex-nowrap items-center gap-2">
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
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7d90b5]">
                      {editingType ? "Cập nhật loại vi phạm" : "Thêm loại vi phạm"}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-[#173a78]">
                      {editingType ? editingType.name : "Loại vi phạm mới"}
                    </h2>
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

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Tên loại vi phạm *</span>
                    <InputField
                      value={form.name}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, name: event.target.value }));
                        setFormError("");
                      }}
                      className="mt-2"
                      placeholder="Nhập tên loại vi phạm"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
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
    </>
  );
}
