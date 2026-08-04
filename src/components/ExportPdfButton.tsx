import { useState } from "react";
import { FileDown, LoaderCircle } from "lucide-react";
import { triggerBlobDownload } from "../utils/downloadFile";

type ExportPdfButtonProps = {
  fetcher: () => Promise<{ blob: Blob; filename: string }>;
  label?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * Nút "Xuất PDF" dùng chung cho mọi trang quản trị. Dự án chưa có toast library
 * nên lỗi được báo bằng window.alert — nếu sau này thêm toast, chỉ cần sửa ở đây.
 */
export default function ExportPdfButton({
  fetcher,
  label = "Xuất PDF",
  className,
  disabled,
}: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { blob, filename } = await fetcher();
      triggerBlobDownload(blob, filename);
    } catch {
      window.alert("Không thể xuất PDF. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={
        className ??
        "inline-flex h-10 items-center gap-2 rounded-xl border border-[#c6d8f4] bg-white px-4 text-sm font-semibold text-[#244cb8] shadow-[0_4px_10px_rgba(36,76,184,0.10)] transition hover:-translate-y-0.5 hover:bg-[#eef5ff] disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      {loading ? "Đang xuất..." : label}
    </button>
  );
}
