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
  const userEmail = user?.email || "student@gmail.com";
  const initials = getInitials(userName);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200/70">
      <header className="flex h-16 border-b border-slate-300 bg-slate-50 shadow-sm">
        <div className="flex w-[620px] items-center px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-slate-800"
              aria-label={isSidebarOpen ? "An sidebar" : "Mo sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
            <img src="/STU-topbar.png" alt="STU Dormitory" className="h-10 w-[220px] object-contain object-left" />
          </div>
          <span className="ml-8 whitespace-nowrap text-lg font-semibold text-slate-700">Hệ Thống Quản Lý Ký Túc Xá</span>
        </div>

        <div className="flex flex-1 items-center justify-end px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="relative rounded-lg p-2 text-slate-500 transition hover:bg-teal-50 hover:text-teal-600"
            >
              <BellRing className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
            </button>

            <div className="flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-primary-soft)] px-2 py-1 pr-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white shadow-sm">
                {initials}
              </div>
              <span className="text-sm font-medium text-slate-700">{userName}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[var(--color-primary-hover)] active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {isSidebarOpen && (
          <aside className="flex w-[260px] flex-col border-r border-slate-400 bg-gradient-to-b from-slate-100 via-[#dceff4] to-slate-100 p-4 text-slate-800 shadow-[10px_0_30px_rgba(15,23,42,0.12)]">
            <div className="flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <nav className="space-y-2">
                {studentMenu.map((item) => {
                  const Icon = item.icon;
                  const baseClassName =
                    "group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all duration-200";

                  if (!item.to) {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        className={`${baseClassName} hover:translate-x-0.5 hover:scale-[1.02] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary-hover)]`}
                      >
                        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded bg-transparent"></span>
                        <Icon className="h-5 w-5 flex-shrink-0 text-slate-500 transition-colors duration-200 group-hover:text-[var(--color-primary-hover)]" />
                        <span>{item.label}</span>
                      </button>
                    );
                  }

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        [
                          baseClassName,
                          isActive
                            ? "border-l-4 border-[var(--color-primary)] bg-[var(--color-primary-hover)] text-white shadow-[0_16px_30px_rgba(36,159,176,0.38)]"
                            : "hover:translate-x-0.5 hover:scale-[1.02] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary-hover)]",
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
                                : "text-slate-500 group-hover:text-[var(--color-primary-hover)]"
                            }`}
                          />
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="mt-4 rounded-xl border border-slate-400 bg-white/90 p-3 shadow-[0_10px_20px_rgba(15,23,42,0.12)] backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white shadow-sm">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{userName}</p>
                  <p className="truncate text-xs text-slate-500">{userEmail}</p>
                </div>
              </div>
            </div>
          </aside>
        )}

        <div className="flex h-full flex-1 flex-col">
          <div className="flex-1 overflow-hidden bg-slate-100/60 px-6 pt-1">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
