import { useState } from "react";
import { FileSpreadsheet, LoaderCircle } from "lucide-react";
import { triggerBlobDownload } from "../utils/downloadFile";

type ExportExcelButtonProps = {
  fetcher: () => Promise<{ blob: Blob; filename: string }>;
  label?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * Nút "Xuất Excel" dùng chung, sinh đôi với ExportPdfButton — cùng cơ chế tải blob,
 * chỉ khác icon/label/tông màu (xanh lá) để phân biệt khi đặt cạnh nút Xuất PDF.
 */
export default function ExportExcelButton({
  fetcher,
  label = "Xuất Excel",
  className,
  disabled,
}: ExportExcelButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { blob, filename } = await fetcher();
      triggerBlobDownload(blob, filename);
    } catch {
      window.alert("Không thể xuất Excel. Vui lòng thử lại.");
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
        "inline-flex h-10 items-center gap-2 rounded-xl border border-[#bfe3d0] bg-white px-4 text-sm font-semibold text-[#0f7a4f] shadow-[0_4px_10px_rgba(15,122,79,0.10)] transition hover:-translate-y-0.5 hover:bg-[#eefbf3] disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-4 w-4" />
      )}
      {loading ? "Đang xuất..." : label}
    </button>
  );
}
