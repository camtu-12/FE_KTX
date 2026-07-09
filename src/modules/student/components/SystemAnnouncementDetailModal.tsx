import { Loader2, Paperclip, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getStudentSystemAnnouncement,
  type StudentSystemAnnouncementDetail,
} from "../../../api/notificationApi";

type Props = {
  announcementId: number | null;
  onClose: () => void;
};

const typeLabels: Record<string, string> = {
  general: "Thông báo chung",
  warning: "Cảnh cáo",
  urgent: "Khẩn cấp",
  reminder: "Nhắc nhở",
  policy: "Nội quy",
};

const priorityLabels: Record<string, string> = {
  normal: "Bình thường",
  important: "Quan trọng",
  urgent: "Khẩn cấp",
};

function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function SystemAnnouncementDetailModal({ announcementId, onClose }: Props) {
  const [item, setItem] = useState<StudentSystemAnnouncementDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!announcementId) {
      setItem(null);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    getStudentSystemAnnouncement(announcementId)
      .then(setItem)
      .catch(() => {
        setItem(null);
        setError("Không thể tải chi tiết thông báo.");
      })
      .finally(() => setLoading(false));
  }, [announcementId]);

  if (!announcementId) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-[24px] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
        <div className="flex items-center justify-between border-b border-[#eef3fb] px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7b8fb7]">Chi tiết thông báo</p>
            <h2 className="mt-1 text-lg font-extrabold text-[#1a2d52]">{item?.title || "Thông báo"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-[#6f84ad] hover:bg-[#eef5ff]" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#244cb8]" /></div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>
          ) : item ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBox label="Loại thông báo" value={typeLabels[item.type] || "Thông báo"} />
                {item.priority && <InfoBox label="Mức độ" value={priorityLabels[item.priority] || item.priority} />}
                <InfoBox label="Thời gian gửi" value={formatTime(item.sent_at || item.created_at)} />
              </div>

              <div className="rounded-2xl border border-[#e5edf8] bg-[#f8fbff] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7b8fb7]">Nội dung</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#1f3152]">{item.content}</p>
              </div>

              {(item.attachment_url || item.attachment_path) && (
                <a
                  href={item.attachment_url || item.attachment_path || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#d6e2f1] bg-[#eef5ff] px-4 py-2.5 text-sm font-bold text-[#244cb8] hover:bg-[#dceaff]"
                >
                  <Paperclip className="h-4 w-4" />
                  File đính kèm
                </a>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-[#eef3fb] px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-2xl bg-[#244cb8] px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(36,76,184,0.22)]">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e5edf8] bg-[#f8fbff] px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7b8fb7]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[#1a2d52]">{value}</p>
    </div>
  );
}
