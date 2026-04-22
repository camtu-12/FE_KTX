import {
  BellRing,
  BedSingle,
  CreditCard,
  FileCheck2,
  FilePenLine,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

type MenuItem = {
  label: string;
  to?: string;
  icon: LucideIcon;
};

const studentMenu: MenuItem[] = [
  {
    label: "Dashboard",
    to: "/student/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Đăng ký nội trú",
    to: "/student/registration",
    icon: FilePenLine,
  },
  {
    label: "Phòng của tôi",
    icon: BedSingle,
  },
  {
    label: "Hợp đồng",
    icon: FileCheck2,
  },
  {
    label: "Thanh toán",
    icon: CreditCard,
  },
  {
    label: "Thông báo",
    icon: BellRing,
  },
];

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "U";
  }

  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export default function StudentLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : null;
  const userName = user?.fullName || user?.email || "Student User";
  const studentCode = user?.studentCode || user?.mssv || "DH52201699";
  const initials = getInitials(userName);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#f7faff_0%,#edf2f8_42%,#e8eef7_100%)]">
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex h-16 border-b border-[#d4e1f3] bg-white/88 shadow-[0_14px_32px_rgba(17,40,97,0.09)] backdrop-blur-xl"
      >
        <div className="flex w-[620px] items-center px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="rounded-lg border border-[#c9d8f1] bg-white p-2 text-[#5470a6] shadow-[0_8px_20px_rgba(17,40,97,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-hover)]"
              aria-label={isSidebarOpen ? "An sidebar" : "Mo sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
            <img src="/STU-topbar.png" alt="STU Dormitory" className="h-10 w-[220px] object-contain object-left" />
          </div>
          <span className="ml-8 whitespace-nowrap text-lg font-semibold text-[#2f4f8f]">Hệ Thống Quản Lý Ký Túc Xá</span>
        </div>

        <div className="flex flex-1 items-center justify-end px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-3 rounded-full border border-[#c7d6ee] bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_58%,#e3edff_100%)] px-2.5 py-1.5 pr-3 text-[#244cb8] shadow-[0_10px_22px_rgba(36,76,184,0.10)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d1def4] bg-[linear-gradient(135deg,#2d58c4_0%,#244cb8_72%,#1b3f97_100%)] text-sm font-bold text-white shadow-[0_8px_18px_rgba(36,76,184,0.18)]">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[0.88rem] font-semibold leading-tight text-[#24407f]">{userName}</p>
                <p className="mt-0.5 text-[0.78rem] font-semibold tracking-[0.02em] text-[#5b74a6]">{studentCode}</p>
              </div>
              <button
                type="button"
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] transition-all duration-300 hover:bg-[#dfe9ff] hover:text-[var(--color-primary-hover)] hover:shadow-[0_8px_18px_rgba(36,76,184,0.14)]"
                aria-label="Thông báo"
              >
                <BellRing className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#ff5a6b] ring-2 ring-[#eef3ff]"></span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-primary)_0%,#2d58c4_100%)] text-white shadow-[0_10px_20px_rgba(36,76,184,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_14px_24px_rgba(36,76,184,0.24)] active:scale-[0.98]"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.header>

      <div className="flex h-[calc(100vh-4rem)]">
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: -36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -36, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex w-[260px] flex-col border-r border-[#244a8e] bg-[linear-gradient(180deg,#163a79_0%,#1d4d9f_58%,#2b77b9_100%)] p-4 text-white shadow-[16px_0_34px_rgba(17,40,97,0.32)]"
            >
            <div className="flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <nav className="space-y-2">
                {studentMenu.map((item) => {
                  const Icon = item.icon;
                  const baseClassName =
                    "group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#d6e7ff] transition-all duration-300";

                  if (!item.to) {
                    return (
                      <motion.button
                        key={item.label}
                        type="button"
                        whileHover={{ x: 2, scale: 1.02 }}
                        whileTap={{ scale: 0.99 }}
                        className={`${baseClassName} hover:translate-x-0.5 hover:scale-[1.02] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary-hover)]`}
                      >
                        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded bg-transparent"></span>
                        <Icon className="h-5 w-5 flex-shrink-0 text-[#b7d1f5] transition-colors duration-300 group-hover:text-white" />
                        <span>{item.label}</span>
                      </motion.button>
                    );
                  }

                  return (
                    <motion.div key={item.to} whileHover={{ x: 2, scale: 1.02 }} whileTap={{ scale: 0.99 }}>
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        [
                          baseClassName,
                          isActive
                            ? "border-l-4 border-white bg-[linear-gradient(135deg,#2d58c4_0%,#31b7d4_100%)] text-white shadow-[0_16px_30px_rgba(26,132,217,0.42)]"
                            : "hover:bg-white/15 hover:text-white",
                        ].join(" ")
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded ${
                              isActive ? "bg-white/90" : "bg-transparent"
                            }`}
                          ></span>
                          <Icon
                            className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
                              isActive
                                ? "text-white"
                                : "text-[#b7d1f5] group-hover:text-white"
                            }`}
                          />
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                    </motion.div>
                  );
                })}
              </nav>
            </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <div className="flex h-full flex-1 flex-col">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
            className="flex-1 overflow-hidden bg-white/35 px-6 pt-1"
          >
            <Outlet />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
