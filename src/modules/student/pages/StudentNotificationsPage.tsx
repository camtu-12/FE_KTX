import { motion } from "framer-motion";
import { AlertTriangle, Bell, BellRing, CheckCheck, Clock, Loader2, MailWarning, ShieldAlert } from "lucide-react";
import type { ElementType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  getMyNotifications,
  isSystemAnnouncementNotification,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "../../../api/notificationApi";
import SystemAnnouncementDetailModal from "../components/SystemAnnouncementDetailModal";

type FilterKey = "all" | "unread" | "read" | "urgent" | "warning" | "general";

const filters: Array<{ value: FilterKey; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "unread", label: "Chưa đọc" },
  { value: "read", label: "Đã đọc" },
  { value: "urgent", label: "Khẩn cấp" },
  { value: "warning", label: "Cảnh cáo" },
  { value: "general", label: "Thông báo" },
];

const typeMeta: Record<string, { label: string; className: string; icon: ElementType }> = {
  urgent: { label: "Khẩn cấp", className: "border-red-200 bg-red-50 text-red-700", icon: AlertTriangle },
  warning: { label: "Cảnh cáo", className: "border-orange-200 bg-orange-50 text-orange-700", icon: ShieldAlert },
  general: { label: "Thông báo", className: "border-blue-200 bg-blue-50 text-blue-700", icon: BellRing },
  reminder: { label: "Nhắc nhở", className: "border-yellow-200 bg-yellow-50 text-yellow-700", icon: Clock },
  policy: { label: "Nội quy", className: "border-violet-200 bg-violet-50 text-violet-700", icon: MailWarning },
};

function metaFor(type: string) {
  return typeMeta[type] ?? typeMeta.general;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

function getErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === "string" ? message : fallback;
}

export default function StudentNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [systemAnnouncementId, setSystemAnnouncementId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await getMyNotifications(100));
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải danh sách thông báo."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter === "unread") return !item.is_read;
      if (filter === "read") return Boolean(item.is_read);
      if (filter === "urgent") return item.type === "urgent" || item.type === "eviction" || item.type === "force_checkout";
      if (filter === "warning") return item.type === "warning" || item.type === "violation_recorded" || item.type === "payment_reminder";
      if (filter === "general") return item.type === "general" || item.type === "policy" || item.type === "reminder";
      return true;
    });
  }, [filter, items]);

  const handleRead = async (item: NotificationItem) => {
    if (!item.is_read) {
      setItems((current) => current.map((n) => n.recipient_id === item.recipient_id ? { ...n, is_read: true } : n));
      window.dispatchEvent(new Event("student-notifications-updated"));
      try {
        await markNotificationRead(item.recipient_id);
      } catch {
        void load();
      }
    }

    if (isSystemAnnouncementNotification(item) && item.related_id) {
      setSystemAnnouncementId(item.related_id);
    }
  };

  const handleReadAll = async () => {
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    window.dispatchEvent(new Event("student-notifications-updated"));
    try {
      await markAllNotificationsRead();
    } catch {
      void load();
    }
  };

  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="min-h-[calc(100vh-5rem)] space-y-5 rounded-3xl bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-6">
      <div className="flex flex-col gap-4 rounded-[22px] border border-[#c1d6f4] bg-white px-6 py-5 shadow-[0_12px_28px_rgba(36,76,184,0.08)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold text-[#1a2d52]">Thông báo của tôi</h1>
          <p className="mt-1 text-sm text-[#62789f]">Theo dõi các thông báo mới nhất từ hệ thống KTX.</p>
        </div>
        <button type="button" onClick={handleReadAll} className="inline-flex items-center gap-2 rounded-2xl bg-[#244cb8] px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(36,76,184,0.22)] transition hover:-translate-y-0.5">
          <CheckCheck className="h-4 w-4" />
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      <div className="rounded-[22px] border border-[#d6e2f1] bg-white p-4 shadow-[0_12px_28px_rgba(36,76,184,0.08)]">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${filter === item.value ? "bg-[#244cb8] text-white" : "bg-[#eef5ff] text-[#24407f] hover:bg-[#dceaff]"}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#244cb8]" /></div>
        ) : error ? (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 py-12 text-center text-sm font-semibold text-rose-700 shadow-[0_12px_28px_rgba(36,76,184,0.08)]">
            {error}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-[22px] border border-[#d6e2f1] bg-white py-16 text-center shadow-[0_12px_28px_rgba(36,76,184,0.08)]">
            <Bell className="mx-auto h-10 w-10 text-[#b7c9e4]" />
            <p className="mt-3 text-sm font-semibold text-[#6f84ad]">Không có thông báo phù hợp.</p>
          </div>
        ) : filteredItems.map((item) => {
          const meta = metaFor(item.type);
          const Icon = meta.icon;
          const unread = !item.is_read;

          return (
            <button key={item.recipient_id} type="button" onClick={() => void handleRead(item)} className={`flex w-full gap-4 rounded-[22px] border p-5 text-left shadow-[0_10px_24px_rgba(36,76,184,0.07)] transition hover:-translate-y-0.5 ${unread ? "border-[#b8ccf0] bg-white" : "border-[#dce6f4] bg-white/80"}`}>
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${meta.className}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className={`text-base ${unread ? "font-extrabold text-[#1a2d52]" : "font-bold text-[#3b5199]"}`}>{item.title}</span>
                  {unread && <span className="rounded-full bg-[#ff5a6b] px-2 py-0.5 text-[10px] font-bold text-white">Mới</span>}
                </span>
                <span className="mt-2 block whitespace-pre-line text-sm leading-6 text-[#62789f]">{item.content}</span>
                <span className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-[#8aa4cc]">
                  <span className={`rounded-full border px-2.5 py-1 ${meta.className}`}>{meta.label}</span>
                  <span>{formatTime(item.created_at)}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <SystemAnnouncementDetailModal
        announcementId={systemAnnouncementId}
        onClose={() => setSystemAnnouncementId(null)}
      />
    </motion.section>
  );
}
