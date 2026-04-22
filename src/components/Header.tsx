import {
  BellRing,
  ChevronDown,
  KeyRound,
  LogOut,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import AppBrand from "./AppBrand";

export type HeaderRole = "admin" | "student";

type HeaderProps = {
  role: HeaderRole;
  userName: string;
  userEmail?: string;
  studentCode?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  onLogout: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
};

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "U";
  }

  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export default function Header({
  role,
  userName,
  userEmail,
  studentCode,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onLogout,
  isSidebarOpen = true,
  onToggleSidebar,
}: HeaderProps) {
  const initials = getInitials(userName);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const secondaryLabel = role === "student" ? studentCode ?? "SV001" : "Quản trị viên";

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isUserMenuOpen]);

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

      <div className="flex items-center justify-end gap-4 px-4 sm:px-6">
        {onSearchChange ? (
          <label className="hidden h-12 w-[420px] items-center gap-3 rounded-2xl border border-[#d6e2f1] bg-white/92 px-4 shadow-[0_10px_24px_rgba(36,76,184,0.08)] transition focus-within:border-[#244cb8] focus-within:ring-4 focus-within:ring-[#244cb8]/12 xl:flex">
            <Search className="h-4 w-4 flex-shrink-0 text-[#7c8fb5]" />
            <input
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder ?? "Tìm kiếm"}
              className="w-full bg-transparent text-sm text-[#1f3152] outline-none placeholder:text-[#94a6c4]"
            />
          </label>
        ) : null}

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
                {userName}
              </p>
              <p className="mt-0.5 text-[0.78rem] font-semibold tracking-[0.02em] text-[#5b74a6]">
                {secondaryLabel}
              </p>
            </div>

            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <BellRing className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#ff5a6b] ring-2 ring-[#eef3ff]"></span>
            </span>

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
