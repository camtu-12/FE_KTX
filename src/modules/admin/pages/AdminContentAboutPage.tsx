import { useEffect, useRef, useState } from "react";
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
    "w-full rounded-xl border border-[#d9e4f4] bg-white px-4 py-3 text-sm text-[#1e293b] placeholder-[#94a3b8] outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20";

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#2563eb]" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">

      {/* Toast */}
      {toast && (
        <div
          className={`mb-6 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {toast.type === "success"
            ? <CheckCircle2 className="h-5 w-5 shrink-0" />
            : <XCircle     className="h-5 w-5 shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-[#0f172a]">
          Quản lý nội dung trang Giới thiệu
        </h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Chỉnh sửa nội dung hiển thị tại trang{" "}
          <span className="font-medium text-[#2563eb]">/about</span>
        </p>
      </div>

      {/* Form */}
      <div className="space-y-6 rounded-2xl border border-[#d9e4f4] bg-white p-6 shadow-[0_8px_24px_rgba(17,40,97,0.06)]">

        {/* Ảnh đại diện */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[#1e293b]">
            Ảnh đại diện KTX
          </label>

          {/* Preview */}
          {displayImage ? (
            <div className="relative mb-3 overflow-hidden rounded-xl border border-[#d9e4f4]">
              <img
                src={displayImage}
                alt="Preview ảnh đại diện"
                className="h-96 w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "https://placehold.co/900x192/e2e8f0/94a3b8?text=Ảnh+KTX";
                }}
              />
              {/* Badge "Mới" khi đang preview file chưa lưu */}
              {previewUrl && (
                <span className="absolute left-3 top-3 rounded-lg bg-[#2563eb] px-2 py-0.5 text-xs font-bold text-white shadow">
                  Chưa lưu
                </span>
              )}
              {/* Nút xoá preview mới */}
              {previewUrl && (
                <button
                  type="button"
                  onClick={handleRemoveNewImage}
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#64748b] shadow hover:bg-white hover:text-rose-500"
                  title="Huỷ ảnh mới"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              )}
            </div>
          ) : (
            <div className="mb-3 flex h-96 items-center justify-center rounded-xl border-2 border-dashed border-[#d9e4f4] bg-[#f7faff] text-sm text-[#94a3b8]">
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d9e4f4] bg-[#f7faff] px-4 py-2 text-sm font-semibold text-[#2563eb] transition hover:border-[#2563eb]/40 hover:bg-[#eef3ff]"
          >
            <ImagePlus size={16} strokeWidth={2.1} />
            {displayImage ? "Đổi ảnh" : "Chọn ảnh"}
          </button>
          <p className="mt-1.5 text-xs text-[#94a3b8]">
            JPG, PNG hoặc WebP. Tối đa 5 MB.
          </p>
        </div>

        {/* Tiêu đề */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[#1e293b]">
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
          <label className="mb-1.5 block text-sm font-semibold text-[#1e293b]">
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

        {/* Nội dung HTML */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[#1e293b]">
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
          <p className="mt-1.5 text-xs text-[#94a3b8]">
            Hỗ trợ định dạng HTML. Dùng &lt;h3&gt; cho tiêu đề phần, &lt;p&gt; cho đoạn văn.
          </p>
          {errors.content && <p className="mt-1 text-xs text-rose-500">{errors.content}</p>}
        </div>

        {/* Nút lưu */}
        <div className="flex justify-end border-t border-[#e8f0fb] pt-5">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1d4ed8] hover:shadow-[0_12px_28px_rgba(37,99,235,0.36)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
