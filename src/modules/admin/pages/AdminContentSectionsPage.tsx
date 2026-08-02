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
  type PageItemIcon,
  type PageSections,
} from "../../../api/staticPageApi";

const ICON_MAP: Record<PageItemIcon, LucideIcon> = {
  BadgeCheck, FileText, ClipboardCheck, CreditCard, Home, Utensils, Car, BookOpen,
  Users, Camera, Flame, ShieldCheck, Wifi, Droplets, Building2, BedDouble, AlarmClock, PhoneCall,
};

const PAGE_OPTIONS = [
  { slug: "ct-dieu-kien-dang-ky", label: "Điều kiện đăng ký" },
  { slug: "ct-ho-so-can-chuan-bi", label: "Hồ sơ cần chuẩn bị" },
  { slug: "ct-quy-trinh-xet-duyet", label: "Quy trình xét duyệt" },
  { slug: "ct-quy-dinh-thanh-toan", label: "Quy định thanh toán" },
  { slug: "ct-noi-quy-ktx", label: "Nội quy KTX" },
];

type ToastState = { type: "success" | "error"; message: string } | null;

const emptySections: PageSections = {
  hero_icon: "ShieldCheck",
  groups: [],
  steps: [],
  highlights_title: null,
  highlights: [],
  notes_title: null,
  notes: [],
};

function IconPicker({
  value,
  onChange,
  open,
  onToggle,
}: {
  value: PageItemIcon;
  onChange: (icon: PageItemIcon) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = ICON_MAP[value];
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#eef3ff_0%,#f5f9ff_100%)] text-[#244cb8] shadow-[0_10px_20px_rgba(36,76,184,0.08)] transition hover:scale-105"
        title="Đổi icon"
      >
        <Icon size={19} strokeWidth={2.1} />
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-9 gap-1.5 rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] p-2.5">
          {ALLOWED_PAGE_ITEM_ICONS.map((iconName) => {
            const OptionIcon = ICON_MAP[iconName];
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => onChange(iconName)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white ${
                  value === iconName ? "bg-white text-[#244cb8] shadow" : "text-[#94a6c4]"
                }`}
                title={iconName}
              >
                <OptionIcon size={15} strokeWidth={2} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminContentSectionsPage() {
  const [slug, setSlug] = useState(PAGE_OPTIONS[0].slug);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [sections, setSections] = useState<PageSections>(emptySections);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  // Tên hiển thị trong dropdown lấy TRỰC TIẾP từ tiêu đề thật của từng trang (không dùng tên
  // cố định trong code) — đổi tiêu đề trang nào, dropdown tự cập nhật theo ngay, không lệch.
  const [optionTitles, setOptionTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all(
      PAGE_OPTIONS.map((opt) =>
        fetchStaticPage(opt.slug)
          .then((page) => [opt.slug, page.title || opt.label] as const)
          .catch(() => [opt.slug, opt.label] as const),
      ),
    ).then((pairs) => setOptionTitles(Object.fromEntries(pairs)));
  }, []);

  useEffect(() => {
    setLoading(true);
    setOpenPicker(null);
    fetchStaticPage(slug)
      .then((page) => {
        setTitle(page.title ?? "");
        setSummary(page.summary ?? "");
        setSections(page.sections ?? emptySections);
      })
      .catch(() => showToast("error", "Không thể tải nội dung trang."))
      .finally(() => setLoading(false));
  }, [slug]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSave() {
    if (!title.trim()) {
      showToast("error", "Tiêu đề trang không được để trống.");
      return;
    }
    for (const g of sections.groups) {
      if (!g.title.trim()) {
        showToast("error", "Có nhóm đang thiếu tiêu đề.");
        return;
      }
    }
    for (const s of sections.steps) {
      if (!s.title.trim()) {
        showToast("error", "Có bước đang thiếu tiêu đề.");
        return;
      }
    }
    for (const h of sections.highlights) {
      if (!h.label.trim()) {
        showToast("error", "Có mục nổi bật đang thiếu nội dung.");
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await updateStaticPage(slug, { title: title.trim(), summary: summary.trim(), sections });
      setOptionTitles((prev) => ({ ...prev, [slug]: updated.title }));
      showToast("success", "Đã lưu nội dung thành công.");
    } catch {
      showToast("error", "Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  const inputBase =
    "w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#1f3152] placeholder:text-[#94a6c4] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12";
  const labelBase = "mb-1.5 block text-sm font-bold text-[#1a2d52]";
  const sectionCard = "rounded-[20px] border border-[#d6e2f1] bg-white p-4 shadow-[0_12px_28px_rgba(36,76,184,0.09)] sm:p-6";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:px-8">
        <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">
          Quản lý nội dung — Trang chi tiết
        </h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[#62789f] sm:text-sm">
          Chỉnh sửa nội dung đầy đủ của các trang chi tiết được liên kết từ danh sách "Quy định đăng ký" trên trang chủ.
        </p>

        <div className="mt-4 max-w-md">
          <label className={labelBase}>Chọn trang cần sửa</label>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className={inputBase}
          >
            {PAGE_OPTIONS.map((opt) => (
              <option key={opt.slug} value={opt.slug}>
                {optionTitles[opt.slug] ?? opt.label}
              </option>
            ))}
          </select>
        </div>
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
                {toast.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
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
          {/* Hero */}
          <div className={sectionCard}>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.1em] text-[#6f84ad]">Tiêu đề trang</h2>
            <div className="flex items-start gap-4">
              <IconPicker
                value={sections.hero_icon}
                open={openPicker === "hero"}
                onToggle={() => setOpenPicker(openPicker === "hero" ? null : "hero")}
                onChange={(icon) => {
                  setSections((s) => ({ ...s, hero_icon: icon }));
                  setOpenPicker(null);
                }}
              />
              <div className="flex-1 space-y-3">
                <input
                  value={title}
                  readOnly
                  placeholder="Tiêu đề trang"
                  className={`${inputBase} cursor-not-allowed opacity-70`}
                />
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Mô tả ngắn dưới tiêu đề"
                  className={`${inputBase} resize-y`}
                />
              </div>
            </div>
          </div>

          {/* Groups */}
          <div className={sectionCard}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[#6f84ad]">Các nhóm nội dung (thẻ lớn có checklist)</h2>
            </div>
            <div className="space-y-4">
              {sections.groups.map((group, index) => (
                <div key={index} className="rounded-2xl border border-[#e6eef8] p-4">
                  <div className="flex items-start gap-3">
                    <GripVertical className="mt-3 h-4 w-4 shrink-0 text-[#c3d2ea]" />
                    <IconPicker
                      value={group.icon}
                      open={openPicker === `group-${index}`}
                      onToggle={() => setOpenPicker(openPicker === `group-${index}` ? null : `group-${index}`)}
                      onChange={(icon) => {
                        setSections((s) => ({
                          ...s,
                          groups: s.groups.map((g, i) => (i === index ? { ...g, icon } : g)),
                        }));
                        setOpenPicker(null);
                      }}
                    />
                    <div className="flex-1 space-y-2.5">
                      <input
                        value={group.title}
                        onChange={(e) =>
                          setSections((s) => ({ ...s, groups: s.groups.map((g, i) => (i === index ? { ...g, title: e.target.value } : g)) }))
                        }
                        placeholder="Tiêu đề nhóm"
                        className={inputBase}
                      />
                      <textarea
                        rows={2}
                        value={group.description ?? ""}
                        onChange={(e) =>
                          setSections((s) => ({
                            ...s,
                            groups: s.groups.map((g, i) => (i === index ? { ...g, description: e.target.value || null } : g)),
                          }))
                        }
                        placeholder="Mô tả (không bắt buộc)"
                        className={`${inputBase} resize-y`}
                      />
                      <GroupItemsEditor
                        items={group.items}
                        onChange={(items) =>
                          setSections((s) => ({ ...s, groups: s.groups.map((g, i) => (i === index ? { ...g, items } : g)) }))
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSections((s) => ({ ...s, groups: s.groups.filter((_, i) => i !== index) }))}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#c3d2ea] transition hover:bg-rose-50 hover:text-rose-500"
                      title="Xoá nhóm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setSections((s) => ({
                  ...s,
                  groups: [...s.groups, { icon: "BadgeCheck", title: "", description: null, items: [] }],
                }))
              }
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#c8d8ef] bg-white/60 py-2.5 text-sm font-semibold text-[#244cb8] transition hover:border-[#244cb8] hover:bg-white"
            >
              <Plus size={16} /> Thêm nhóm
            </button>
          </div>

          {/* Steps */}
          <div className={sectionCard}>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.1em] text-[#6f84ad]">Các bước ngắn (chỉ icon + tiêu đề, hiển thị ngang)</h2>
            <div className="space-y-3">
              {sections.steps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 rounded-2xl border border-[#e6eef8] p-3">
                  <IconPicker
                    value={step.icon}
                    open={openPicker === `step-${index}`}
                    onToggle={() => setOpenPicker(openPicker === `step-${index}` ? null : `step-${index}`)}
                    onChange={(icon) => {
                      setSections((s) => ({ ...s, steps: s.steps.map((st, i) => (i === index ? { ...st, icon } : st)) }));
                      setOpenPicker(null);
                    }}
                  />
                  <input
                    value={step.title}
                    onChange={(e) => setSections((s) => ({ ...s, steps: s.steps.map((st, i) => (i === index ? { ...st, title: e.target.value } : st)) }))}
                    placeholder="Tiêu đề bước"
                    className={inputBase}
                  />
                  <button
                    type="button"
                    onClick={() => setSections((s) => ({ ...s, steps: s.steps.filter((_, i) => i !== index) }))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#c3d2ea] transition hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSections((s) => ({ ...s, steps: [...s.steps, { icon: "BadgeCheck", title: "" }] }))}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#c8d8ef] bg-white/60 py-2.5 text-sm font-semibold text-[#244cb8] transition hover:border-[#244cb8] hover:bg-white"
            >
              <Plus size={16} /> Thêm bước
            </button>
          </div>

          {/* Highlights */}
          <div className={sectionCard}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[#6f84ad]">Khối cảnh báo / nổi bật (không bắt buộc)</h2>
            <input
              value={sections.highlights_title ?? ""}
              onChange={(e) => setSections((s) => ({ ...s, highlights_title: e.target.value || null }))}
              placeholder="Tiêu đề khối (VD: Các trường hợp không đủ điều kiện)"
              className={`${inputBase} mb-3`}
            />
            <div className="space-y-3">
              {sections.highlights.map((h, index) => (
                <div key={index} className="flex items-center gap-3 rounded-2xl border border-[#e6eef8] p-3">
                  <IconPicker
                    value={h.icon}
                    open={openPicker === `hl-${index}`}
                    onToggle={() => setOpenPicker(openPicker === `hl-${index}` ? null : `hl-${index}`)}
                    onChange={(icon) => {
                      setSections((s) => ({ ...s, highlights: s.highlights.map((x, i) => (i === index ? { ...x, icon } : x)) }));
                      setOpenPicker(null);
                    }}
                  />
                  <input
                    value={h.label}
                    onChange={(e) => setSections((s) => ({ ...s, highlights: s.highlights.map((x, i) => (i === index ? { ...x, label: e.target.value } : x)) }))}
                    placeholder="Nội dung"
                    className={inputBase}
                  />
                  <button
                    type="button"
                    onClick={() => setSections((s) => ({ ...s, highlights: s.highlights.filter((_, i) => i !== index) }))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#c3d2ea] transition hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSections((s) => ({ ...s, highlights: [...s.highlights, { icon: "ShieldCheck", label: "" }] }))}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#c8d8ef] bg-white/60 py-2.5 text-sm font-semibold text-[#244cb8] transition hover:border-[#244cb8] hover:bg-white"
            >
              <Plus size={16} /> Thêm mục nổi bật
            </button>
          </div>

          {/* Notes */}
          <div className={sectionCard}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[#6f84ad]">Khối ghi chú đơn giản (không bắt buộc)</h2>
            <input
              value={sections.notes_title ?? ""}
              onChange={(e) => setSections((s) => ({ ...s, notes_title: e.target.value || null }))}
              placeholder="Tiêu đề khối (VD: Lưu ý quan trọng)"
              className={`${inputBase} mb-3`}
            />
            <div className="space-y-3">
              {sections.notes.map((note, index) => (
                <div key={index} className="flex items-center gap-3 rounded-2xl border border-[#e6eef8] p-3">
                  <input
                    value={note}
                    onChange={(e) => setSections((s) => ({ ...s, notes: s.notes.map((n, i) => (i === index ? e.target.value : n)) }))}
                    placeholder="Nội dung ghi chú"
                    className={inputBase}
                  />
                  <button
                    type="button"
                    onClick={() => setSections((s) => ({ ...s, notes: s.notes.filter((_, i) => i !== index) }))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#c3d2ea] transition hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSections((s) => ({ ...s, notes: [...s.notes, ""] }))}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#c8d8ef] bg-white/60 py-2.5 text-sm font-semibold text-[#244cb8] transition hover:border-[#244cb8] hover:bg-white"
            >
              <Plus size={16} /> Thêm ghi chú
            </button>
          </div>

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

function GroupItemsEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  return (
    <div className="space-y-2 rounded-xl bg-[#f8fbff] p-2.5">
      <div className="text-xs font-bold uppercase tracking-[0.1em] text-[#8aa4cc]">Checklist bên trong nhóm</div>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={item}
            onChange={(e) => onChange(items.map((it, idx) => (idx === i ? e.target.value : it)))}
            className="w-full rounded-xl border border-[#d6e2f1] bg-white px-3 py-2 text-sm font-medium text-[#1f3152] outline-none focus:border-[#244cb8]"
            placeholder="Nội dung dòng checklist"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#c3d2ea] hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="flex items-center gap-1.5 text-xs font-bold text-[#244cb8] hover:underline"
      >
        <Plus size={13} /> Thêm dòng
      </button>
    </div>
  );
}
