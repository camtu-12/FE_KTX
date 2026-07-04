import {
  Bell,
  BellRing,
  Camera,
  CheckCheck,
  ChevronDown,
  Home,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Search,
  ShieldCheck,
  ShieldX,
  X,
  Zap,
} from "lucide-react";
import type { NavAutocompleteConfig } from "../types/navAutocomplete";
import type { PeriodAutocompleteConfig } from "../types/periodAutocomplete";
import AppBrand from "./AppBrand";
import StudentResultList from "./StudentResultList";
import PeriodResultList from "./PeriodResultList";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAdminNotifications,
  getAdminUnreadCount,
  getMyNotifications,
  getUnreadCount,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  markAllNotificationsRead,
  markNotificationRead,
  type AdminNotificationItem,
  type NotificationItem,
} from "../api/notificationApi";

export type HeaderRole = "admin" | "student";

type HeaderProps = {
  role: HeaderRole;
  userName: string;
  userEmail?: string;
  studentCode?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  navAutocomplete?: NavAutocompleteConfig | null;
  periodAutocomplete?: PeriodAutocompleteConfig | null;
  onOpenFaceSearch?: () => void;
  onLogout: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
};

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function NotifIcon({ type }: { type: string }) {
  if (type === "extension_approved")
    return <ShieldCheck className="h-4 w-4 text-emerald-500" />;
  if (type === "extension_rejected")
    return <ShieldX className="h-4 w-4 text-rose-500" />;
  if (type === "extension_opened")
    return <Bell className="h-4 w-4 text-blue-500" />;
  if (
    type === "bed_transferred_permanent" ||
    type === "bed_transferred_temporary" ||
    type === "bed_maintenance_return" ||
    type === "room_maintenance_start" ||
    type === "room_maintenance_return"
  )
    return <Home className="h-4 w-4 text-amber-500" />;
  if (type === "electricity_bill_created")
    return <Zap className="h-4 w-4 text-yellow-500" />;
  if (type === "payment_reminder" || type === "eviction")
    return <Receipt className="h-4 w-4 text-rose-500" />;
  return <Bell className="h-4 w-4 text-[var(--color-primary)]" />;
}

export default function Header({
  role,
  userName,
  userEmail,
  studentCode,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  navAutocomplete,
  periodAutocomplete,
  onOpenFaceSearch,
  onLogout,
  isSidebarOpen = true,
  onToggleSidebar,
}: HeaderProps) {
  const navigate = useNavigate();
  const initials = getInitials(userName || userEmail || "");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifsLoading, setNotifsLoading] = useState(false);

  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const navSearchRef = useRef<HTMLDivElement | null>(null);
  const navSearchInputRef = useRef<HTMLInputElement | null>(null);

  const isStudent = role === "student" && !!userEmail;
  const isAdmin = role === "admin";

  const secondaryLabel = (() => {
    if (role === "student") return userName || studentCode || "SV001";
    return "Quản trị viên";
  })();

  // Poll unread count every 60 s
  const refreshUnreadCount = useCallback(async () => {
    try {
      if (isStudent) {
        const count = await getUnreadCount(userEmail!);
        setUnreadCount(count);
      } else if (isAdmin) {
        const count = await getAdminUnreadCount();
        setUnreadCount(count);
      }
    } catch {
      // ignore
    }
  }, [isStudent, isAdmin, userEmail]);

  useEffect(() => {
    if (!isStudent && !isAdmin) return;
    refreshUnreadCount();
    const id = setInterval(refreshUnreadCount, 60_000);
    return () => clearInterval(id);
  }, [isStudent, isAdmin, refreshUnreadCount]);

  // Click outside for user menu
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) setIsUserMenuOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isUserMenuOpen]);

  // Click outside / ESC for nav autocomplete dropdown (search sinh viên hoặc đợt đăng ký)
  useEffect(() => {
    const activeAutocomplete = navAutocomplete?.suggestions.length
      ? navAutocomplete
      : periodAutocomplete?.suggestions.length
        ? periodAutocomplete
        : null;
    if (!activeAutocomplete) return;
    const handleClick = (e: MouseEvent) => {
      if (!navSearchRef.current?.contains(e.target as Node)) activeAutocomplete.onDismiss();
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") activeAutocomplete.onDismiss();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [navAutocomplete, periodAutocomplete]);

  // Click outside for notification panel
  useEffect(() => {
    if (!isNotifOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!notifRef.current?.contains(e.target as Node)) setIsNotifOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isNotifOpen]);

  const openNotifications = async () => {
    if (!isStudent && !isAdmin) return;
    setIsNotifOpen((prev) => !prev);
    if (!isNotifOpen) {
      setNotifsLoading(true);
      try {
        if (isStudent) {
          const items = await getMyNotifications(userEmail!, 20);
          setNotifications(items);
          setUnreadCount(items.filter((n) => !n.is_read).length);
        } else {
          const items = await getAdminNotifications(30);
          setAdminNotifications(items);
          setUnreadCount(items.filter((n) => !n.is_read).length);
        }
      } catch {
        // ignore
      } finally {
        setNotifsLoading(false);
      }
    }
  };

  const getStudentNotifTarget = (item: NotificationItem): string | null => {
    if (
      (item.type === "room_change_approved" ||
        item.type === "bed_change_approved" ||
        item.type === "roommate_request_approved") &&
      item.related_id
    ) {
      return `/student/support?open=${item.related_id}`;
    }
    if (
      item.type === "extension_approved" ||
      item.type === "extension_rejected" ||
      item.type === "extension_opened" ||
      item.type === "extension_reminder"
    ) {
      return "/student/extension";
    }
    if (
      item.type === "bed_transferred_permanent" ||
      item.type === "bed_transferred_temporary" ||
      item.type === "bed_maintenance_return" ||
      item.type === "room_maintenance_start" ||
      item.type === "room_maintenance_return"
    ) {
      return "/student/room";
    }
    if (
      item.type === "electricity_bill_created" ||
      item.type === "payment_reminder" ||
      item.type === "eviction"
    ) {
      return "/student/payment";
    }
    return null;
  };

  const handleMarkRead = async (item: NotificationItem) => {
    if (!item.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.recipient_id === item.recipient_id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await markNotificationRead(item.recipient_id, userEmail!);
      } catch {
        // ignore
      }
    }
    const target = getStudentNotifTarget(item);
    if (target) {
      setIsNotifOpen(false);
      navigate(target);
    }
  };

  const handleAdminMarkRead = async (item: AdminNotificationItem) => {
    if (!item.is_read) {
      setAdminNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await markAdminNotificationRead(item.id);
      } catch {
        // ignore
      }
    }
    if (item.type === "support_request_new" && item.related_id) {
      setIsNotifOpen(false);
      navigate(`/admin/support-requests?open=${item.related_id}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (isStudent) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      try { await markAllNotificationsRead(userEmail!); } catch { /* ignore */ }
    } else {
      setAdminNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      try { await markAllAdminNotificationsRead(); } catch { /* ignore */ }
    }
    setUnreadCount(0);
  };

  const badgeCount = Math.min(unreadCount, 99);

  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative z-50 flex h-20 overflow-visible border-b border-[#c3d7f3] bg-[linear-gradient(180deg,rgba(244,249,255,0.96)_0%,rgba(232,241,253,0.92)_100%)] shadow-[0_14px_32px_rgba(17,40,97,0.10)] backdrop-blur-xl"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 sm:px-6">
        {onToggleSidebar ? (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-lg border border-[#c9d8f1] bg-white p-2 text-[#5470a6] shadow-[0_8px_20px_rgba(17,40,97,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-hover)]"
            aria-label={isSidebarOpen ? "Ẩn sidebar" : "Mở sidebar"}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>
        ) : null}

        <div className="min-w-0 origin-left scale-[0.82] sm:scale-[0.92] lg:scale-100">
          <AppBrand />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-4 sm:px-6">
        {onSearchChange ? (
          <div ref={navSearchRef} className="relative hidden xl:block">
            <label className="flex h-12 w-[420px] items-center gap-3 rounded-2xl border border-[#d6e2f1] bg-white/92 px-4 shadow-[0_10px_24px_rgba(36,76,184,0.08)] transition focus-within:border-[#244cb8] focus-within:ring-4 focus-within:ring-[#244cb8]/12">
              <Search className="h-4 w-4 flex-shrink-0 text-[#7c8fb5]" />
              <input
                ref={navSearchInputRef}
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder ?? "Tìm kiếm"}
                className="w-full bg-transparent text-sm text-[#1f3152] outline-none placeholder:text-[#94a6c4]"
              />
              {navAutocomplete?.isSearching || periodAutocomplete?.isSearching ? (
                <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-[#7c8fb5]" />
              ) : searchValue ? (
                <button
                  type="button"
                  onClick={() => { onSearchChange(""); navSearchInputRef.current?.focus(); }}
                  className="flex-shrink-0 rounded-full p-0.5 text-[#94a6c4] transition hover:bg-[#eef3ff] hover:text-[#5470a6]"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}

              {onOpenFaceSearch ? (
                <button
                  type="button"
                  onClick={onOpenFaceSearch}
                  className="flex-shrink-0 rounded-full border border-[#d6e2f1] bg-white p-1.5 text-[#5470a6] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  aria-label="Tìm kiếm bằng khuôn mặt"
                  title="Tìm kiếm bằng khuôn mặt"
                >
                  <Camera className="h-4 w-4" />
                </button>
              ) : null}
            </label>

            {navAutocomplete && navAutocomplete.suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-2xl border border-[#d3e0f2] bg-white shadow-[0_16px_40px_rgba(27,56,122,0.18)]">
                <StudentResultList suggestions={navAutocomplete.suggestions} onSelect={navAutocomplete.onSelect} />
              </div>
            )}

            {periodAutocomplete && periodAutocomplete.suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-2xl border border-[#d3e0f2] bg-white shadow-[0_16px_40px_rgba(27,56,122,0.18)]">
                <PeriodResultList suggestions={periodAutocomplete.suggestions} onSelect={periodAutocomplete.onSelect} />
              </div>
            )}
          </div>
        ) : null}

        {/* Notification bell — students & admins */}
        {(isStudent || isAdmin) ? (
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={openNotifications}
              aria-label="Thông báo"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#c9d8f1] bg-white text-[#5470a6] shadow-[0_8px_20px_rgba(17,40,97,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
            >
              <BellRing className="h-5 w-5" />
              {badgeCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff5a6b] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                  {badgeCount === 99 ? "99+" : badgeCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[380px] overflow-hidden rounded-3xl border border-[#d7e4f7] bg-white shadow-[0_26px_46px_rgba(17,40,97,0.16)]"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-[#eef3fb] px-4 py-3">
                    <span className="text-sm font-semibold text-[#24407f]">Thông báo</span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#5470a6] transition hover:bg-[#eef4ff] hover:text-[#244cb8]"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Đánh dấu tất cả đã đọc
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsNotifOpen(false)}
                        className="rounded-lg p-1 text-[#94a6c4] transition hover:bg-[#f1f5fd] hover:text-[#5470a6]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="max-h-[420px] overflow-y-auto">
                    {notifsLoading ? (
                      <div className="flex items-center justify-center py-10 text-sm text-[#94a6c4]">
                        Đang tải...
                      </div>
                    ) : isStudent && notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-10">
                        <Bell className="h-8 w-8 text-[#c3d3ea]" />
                        <p className="text-sm text-[#94a6c4]">Không có thông báo</p>
                      </div>
                    ) : isAdmin && adminNotifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-10">
                        <Bell className="h-8 w-8 text-[#c3d3ea]" />
                        <p className="text-sm text-[#94a6c4]">Không có thông báo</p>
                      </div>
                    ) : isStudent ? (
                      <ul>
                        {notifications.map((item) => {
                          const unread = !item.is_read;
                          return (
                            <li key={item.recipient_id}>
                              <button
                                type="button"
                                onClick={() => handleMarkRead(item)}
                                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#f5f8ff] ${
                                  unread ? "bg-[#f0f5ff]" : "bg-white"
                                }`}
                              >
                                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-[#eef3ff]">
                                  <NotifIcon type={item.type} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={`text-[0.8rem] leading-snug ${unread ? "font-semibold text-[#24407f]" : "font-medium text-[#3b5199]"}`}>
                                      {item.title}
                                    </p>
                                    {unread && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#ff5a6b]" />}
                                  </div>
                                  <p className="mt-0.5 line-clamp-2 text-[0.75rem] leading-snug text-[#6b7fa8]">{item.content}</p>
                                  <p className="mt-1 text-[0.7rem] text-[#94a6c4]">{relativeTime(item.created_at)}</p>
                                </div>
                              </button>
                              <div className="mx-4 border-b border-[#f1f5fd]" />
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <ul>
                        {adminNotifications.map((item) => {
                          const unread = !item.is_read;
                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => handleAdminMarkRead(item)}
                                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#f5f8ff] ${
                                  unread ? "bg-[#f0f5ff]" : "bg-white"
                                }`}
                              >
                                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-[#eef3ff]">
                                  <Mail className="h-4 w-4 text-[#244cb8]" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={`text-[0.8rem] leading-snug ${unread ? "font-semibold text-[#24407f]" : "font-medium text-[#3b5199]"}`}>
                                      {item.title}
                                    </p>
                                    {unread && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#ff5a6b]" />}
                                  </div>
                                  <p className="mt-0.5 line-clamp-2 text-[0.75rem] leading-snug text-[#6b7fa8]">{item.content}</p>
                                  <p className="mt-1 text-[0.7rem] text-[#94a6c4]">{relativeTime(item.created_at)}</p>
                                </div>
                              </button>
                              <div className="mx-4 border-b border-[#f1f5fd]" />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : null}

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-3 rounded-full border border-[#c7d6ee] bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_58%,#e3edff_100%)] px-2.5 py-1.5 pr-3 text-[#244cb8] shadow-[0_10px_22px_rgba(36,76,184,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#b6caeb] hover:shadow-[0_14px_28px_rgba(36,76,184,0.14)]"
            aria-label="Mở menu tài khoản"
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d1def4] bg-[linear-gradient(135deg,#2d58c4_0%,#244cb8_72%,#1b3f97_100%)] text-sm font-bold text-white shadow-[0_8px_18px_rgba(36,76,184,0.18)]">
              {initials}
            </div>

            <div className="min-w-0 text-left">
              <p className="truncate text-[0.88rem] font-semibold leading-tight text-[#24407f]">
                {userEmail ?? userName}
              </p>
              <p className="mt-0.5 text-[0.78rem] font-semibold tracking-[0.02em] text-[#5b74a6]">
                {secondaryLabel}
              </p>
            </div>

            <ChevronDown
              className={`h-4 w-4 flex-shrink-0 text-[#5b74a6] transition-transform duration-200 ${
                isUserMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {isUserMenuOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[280px] overflow-hidden rounded-3xl border border-[#d7e4f7] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-2 shadow-[0_26px_46px_rgba(17,40,97,0.16)]"
              >
                <div className="space-y-1">
                  <div className="flex items-start gap-3 rounded-2xl px-3 py-3 text-left text-sm text-[#2c467d]">
                    <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-[#e9f0ff] text-[#2d58c4]">
                      <Mail className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="mt-1 truncate font-semibold text-[#24407f]">
                        {userEmail ?? "user@stu.edu.vn"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-[#2c467d] transition hover:bg-[#eef4ff] hover:text-[#244cb8]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#2d58c4]">
                      <KeyRound className="h-4 w-4" />
                    </span>
                    <span>Đổi mật khẩu</span>
                  </button>

                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-[#c23d4d] transition hover:bg-[#fff1f3] hover:text-[#b62f40]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#fff1f3] text-[#d44b5b]">
                      <LogOut className="h-4 w-4" />
                    </span>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
