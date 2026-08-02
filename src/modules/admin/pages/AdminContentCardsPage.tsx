import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  BadgeCheck,
  BedDouble,
  BookOpen,
  Building2,
  Camera,
  Car,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Droplets,
  FileText,
  Flame,
  GripVertical,
  Home,
  Loader2,
  PhoneCall,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  Utensils,
  Wifi,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  ALLOWED_PAGE_ITEM_ICONS,
  fetchStaticPage,
  updateStaticPage,
  type PageItem,
  type PageItemIcon,
} from "../../../api/staticPageApi";

const ICON_MAP: Record<PageItemIcon, LucideIcon> = {
  BadgeCheck,
  FileText,
  ClipboardCheck,
  CreditCard,
  Home,
  Utensils,
  Car,
  BookOpen,
  Users,
  Camera,
  Flame,
  ShieldCheck,
  Wifi,
  Droplets,
  Building2,
  BedDouble,
  AlarmClock,
  PhoneCall,
};

type ToastState = { type: "success" | "error"; message: string } | null;

type Props = {
  slug: string;
  heading: string;
  description: string;
};

const emptyItem = (): PageItem => ({
  icon: "BadgeCheck",
  title: "",
  description: "",
  detail_path: null,
});

export default function AdminContentCardsPage({ slug, heading, description }: Props) {
  const [pageTitle, setPageTitle] = useState("");
  const [items, setItems] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [openIconPickerIndex, setOpenIconPickerIndex] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchStaticPage(slug)
      .then((page) => {
        setPageTitle(page.title ?? "");
        setItems(page.items?.length ? page.items : [emptyItem()]);
      })
      .catch(() => showToast("error", "Không thể tải nội dung trang. Vui lòng thử lại."))
      .finally(() => setLoading(false));
  }, [slug]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  function updateItem(index: number, patch: Partial<PageItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    if (!pageTitle.trim()) {
      showToast("error", "Tiêu đề trang không được để trống.");
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].title.trim() || !items[i].description.trim()) {
        showToast("error", `Thẻ thứ ${i + 1} thiếu tiêu đề hoặc mô tả.`);
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await updateStaticPage(slug, {
        title: pageTitle.trim(),
        items,
      });
      setItems(updated.items);
      showToast("success", "Đã lưu nội dung thành công.");
    } catch {
      showToast("error", "Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  const inputBase =
    "w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#1f3152] placeholder:text-[#94a6c4] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:px-8">
        <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">{heading}</h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[#62789f] sm:text-sm">{description}</p>
      </div>

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
                {toast.type === "success" ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0" />
                )}
                {toast.message}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#244cb8]" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-[20px] border border-[#d6e2f1] bg-white p-4 shadow-[0_12px_28px_rgba(36,76,184,0.09)] sm:p-6">
            <label className="mb-1.5 block text-sm font-bold text-[#1a2d52]">
              Tiêu đề khối <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              placeholder="Tiêu đề hiển thị phía trên danh sách thẻ"
              className={inputBase}
            />
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const Icon = ICON_MAP[item.icon];
              return (
                <div
                  key={index}
                  className="rounded-[20px] border border-[#d6e2f1] bg-white p-4 shadow-[0_12px_28px_rgba(36,76,184,0.09)] sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1.5">
                      <GripVertical className="h-4 w-4 text-[#c3d2ea]" />
                      <button
                        type="button"
                        onClick={() => setOpenIconPickerIndex(openIconPickerIndex === index ? null : index)}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#eef3ff_0%,#f5f9ff_100%)] text-[#244cb8] shadow-[0_10px_20px_rgba(36,76,184,0.08)] transition hover:scale-105"
                        title="Đổi icon"
                      >
                        <Icon size={21} strokeWidth={2.1} />
                      </button>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveItem(index, -1)}
                          disabled={index === 0}
                          className="text-xs text-[#8aa4cc] hover:text-[#244cb8] disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(index, 1)}
                          disabled={index === items.length - 1}
                          className="text-xs text-[#8aa4cc] hover:text-[#244cb8] disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 space-y-3">
                      {openIconPickerIndex === index && (
                        <div className="grid grid-cols-9 gap-2 rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] p-3">
                          {ALLOWED_PAGE_ITEM_ICONS.map((iconName) => {
                            const OptionIcon = ICON_MAP[iconName];
                            return (
                              <button
                                key={iconName}
                                type="button"
                                onClick={() => {
                                  updateItem(index, { icon: iconName });
                                  setOpenIconPickerIndex(null);
                                }}
                                className={`flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-white ${
                                  item.icon === iconName ? "bg-white text-[#244cb8] shadow" : "text-[#94a6c4]"
                                }`}
                                title={iconName}
                              >
                                <OptionIcon size={17} strokeWidth={2} />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItem(index, { title: e.target.value })}
                        placeholder="Tiêu đề thẻ"
                        className={inputBase}
                      />
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => updateItem(index, { description: e.target.value })}
                        placeholder="Mô tả ngắn"
                        className={`${inputBase} resize-y`}
                      />
                      <input
                        type="text"
                        value={item.detail_path ?? ""}
                        onChange={(e) => updateItem(index, { detail_path: e.target.value || null })}
                        placeholder="Link chi tiết (không bắt buộc, VD: /dieu-kien-noi-tru)"
                        className={inputBase}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1}
                      className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#c3d2ea] transition hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
                      title="Xoá thẻ"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#c8d8ef] bg-white/60 py-3 text-sm font-semibold text-[#244cb8] transition hover:border-[#244cb8] hover:bg-white"
          >
            <Plus size={16} /> Thêm thẻ mới
          </button>

          <div className="flex justify-end border-t border-[#e6eef8] pt-5">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="auth-btn-gloss inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_22px_40px_rgba(36,76,184,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      )}
    </motion.section>
  );
}
