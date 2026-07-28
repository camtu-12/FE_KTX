import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ImagePlus, Loader2, X, XCircle } from "lucide-react";
import { fetchStaticPage, updateStaticPage } from "../../../api/staticPageApi";

type FormState = {
  title: string;
  summary: string;
  content: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

const emptyForm: FormState = { title: "", summary: "", content: "" };

export default function AdminContentAboutPage() {
  const [form, setForm]           = useState<FormState>(emptyForm);
  const [errors, setErrors]       = useState<Partial<FormState>>({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<ToastState>(null);

  // Ảnh hiện tại từ DB (URL đầy đủ)
  const [currentImage, setCurrentImage] = useState<string>("");
  // File ảnh mới user vừa chọn
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  // Preview URL cho file mới (object URL)
  const [previewUrl, setPreviewUrl]     = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchStaticPage("gioithieu")
      .then((page) => {
        setForm({
          title:   page.title   ?? "",
          summary: page.summary ?? "",
          content: page.content ?? "",
        });
        // Lấy ảnh đầu tiên làm ảnh đại diện
        if (page.images.length > 0) setCurrentImage(page.images[0]);
      })
      .catch(() => showToast("error", "Không thể tải nội dung trang. Vui lòng thử lại."))
      .finally(() => setLoading(false));
  }, []);

  // Dọn object URL khi unmount hoặc đổi file
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dọn preview cũ
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setNewImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    // Reset input để cho phép chọn lại cùng file
    e.target.value = "";
  }

  function handleRemoveNewImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setNewImageFile(null);
    setPreviewUrl("");
  }

  function validate(): boolean {
    const newErrors: Partial<FormState> = {};
    if (!form.title.trim())   newErrors.title   = "Tiêu đề không được để trống.";
    if (!form.content.trim()) newErrors.content  = "Nội dung không được để trống.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const updated = await updateStaticPage("gioithieu", {
        title:   form.title.trim(),
        summary: form.summary.trim(),
        content: form.content.trim(),
        image:   newImageFile,
      });
      // Cập nhật ảnh hiển thị nếu BE trả về ảnh mới
      if (updated.images.length > 0) setCurrentImage(updated.images[0]);
      // Xoá preview sau khi lưu thành công
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setNewImageFile(null);
      setPreviewUrl("");
      showToast("success", "Đã lưu nội dung trang giới thiệu thành công.");
    } catch {
      showToast("error", "Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  const displayImage = previewUrl || currentImage;

  const inputBase =
    "w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#1f3152] placeholder:text-[#94a6c4] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <motion.div
        transition={{ duration: 0.2 }}
        className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-sm sm:px-8"
      >
        <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">
          Quản lý nội dung trang Giới thiệu
        </h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[#62789f] sm:text-sm">
          Chỉnh sửa nội dung hiển thị tại trang giới thiệu ký túc xá.
        </p>
      </motion.div>

      {/* Toast — khung nổi giữa màn hình */}
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
                  toast.type === "success"
                    ? "border-emerald-200 text-emerald-700"
                    : "border-rose-200 text-rose-700"
                }`}
              >
                {toast.type === "success"
                  ? <CheckCircle2 className="h-5 w-5 shrink-0" />
                  : <XCircle     className="h-5 w-5 shrink-0" />}
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-6 rounded-[20px] border border-[#d6e2f1] bg-white p-4 shadow-[0_12px_28px_rgba(36,76,184,0.09)] sm:p-6"
        >
          {/* Tiêu đề */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-[#1a2d52]">
              Tiêu đề <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => {
                setForm((f) => ({ ...f, title: e.target.value }));
                if (errors.title) setErrors((err) => ({ ...err, title: undefined }));
              }}
              placeholder="Tiêu đề trang giới thiệu"
              className={inputBase}
            />
            {errors.title && <p className="mt-1.5 text-xs text-rose-500">{errors.title}</p>}
          </div>

          {/* Mô tả ngắn */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-[#1a2d52]">
              Mô tả ngắn
            </label>
            <textarea
              rows={3}
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="Đoạn mô tả ngắn hiển thị phía dưới tiêu đề (in đậm)"
              className={`${inputBase} resize-y`}
            />
          </div>

          {/* Ảnh đại diện */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-[#1a2d52]">
              Ảnh đại diện KTX
            </label>

            {/* Preview */}
            {displayImage ? (
              <div className="relative mx-auto mb-3 max-w-md overflow-hidden rounded-2xl border border-[#d6e2f1]">
                <img
                  src={displayImage}
                  alt="Preview ảnh đại diện"
                  className="h-64 w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "https://placehold.co/900x192/e2e8f0/94a3b8?text=Ảnh+KTX";
                  }}
                />
                {/* Badge "Mới" khi đang preview file chưa lưu */}
                {previewUrl && (
                  <span className="absolute left-3 top-3 rounded-lg bg-[#244cb8] px-2 py-0.5 text-xs font-bold text-white shadow">
                    Chưa lưu
                  </span>
                )}
                {/* Nút xoá preview mới */}
                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveNewImage}
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#5470a6] shadow hover:bg-white hover:text-rose-500"
                    title="Huỷ ảnh mới"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            ) : (
              <div className="mx-auto mb-3 flex h-64 max-w-md items-center justify-center rounded-2xl border-2 border-dashed border-[#d6e2f1] bg-[#f8fbff] text-sm text-[#8aa4cc]">
                Chưa có ảnh
              </div>
            )}

            {/* Nút chọn ảnh */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="auth-btn-gloss inline-flex items-center gap-2 rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 py-2 text-sm font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
              >
                <ImagePlus size={16} strokeWidth={2.1} />
                {displayImage ? "Đổi ảnh" : "Chọn ảnh"}
              </button>
              <p className="mt-1.5 text-xs text-[#8aa4cc]">
                JPG, PNG hoặc WebP. Tối đa 5 MB.
              </p>
            </div>
          </div>

          {/* Nội dung HTML */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-[#1a2d52]">
              Nội dung <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={14}
              value={form.content}
              onChange={(e) => {
                setForm((f) => ({ ...f, content: e.target.value }));
                if (errors.content) setErrors((err) => ({ ...err, content: undefined }));
              }}
              placeholder="Nhập nội dung HTML..."
              className={`${inputBase} resize-y font-mono text-xs leading-6`}
            />
            <p className="mt-1.5 text-xs text-[#8aa4cc]">
              Hỗ trợ định dạng HTML. Dùng &lt;h3&gt; cho tiêu đề phần, &lt;p&gt; cho đoạn văn.
            </p>
            {errors.content && <p className="mt-1 text-xs text-rose-500">{errors.content}</p>}
          </div>

          {/* Nút lưu */}
          <div className="flex justify-end border-t border-[#e6eef8] pt-5">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="auth-btn-gloss inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_22px_40px_rgba(36,76,184,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:brightness-100"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}
