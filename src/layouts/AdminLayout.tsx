import {
  LayoutDashboard,
  UserCog,
  LogOut,
  BellRing,
  type LucideIcon,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

type MenuItem = {
  label: string;
  to?: string;
  icon: LucideIcon;
};

const adminMenu: MenuItem[] = [
  {
    label: "Dashboard",
    to: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Quản lý sinh viên",
    to: "/admin/students",
    icon: UserCog,
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

export default function AdminLayout() {
  const navigate = useNavigate();
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : null;
  const userName = user?.fullName || user?.email || "Admin User";
  const initials = getInitials(userName);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="flex min-h-screen">
        <aside className="w-[240px] border-r border-[var(--color-border)] bg-white px-4 py-6">
          <div className="mb-8">
            <img
              src="/STU-topbar.png"
              alt="STU Dormitory"
              className="h-auto w-full object-contain"
            />
          </div>

          <nav className="space-y-1.5">
            {adminMenu.map((item) => {
              const Icon = item.icon;
              const baseClassName =
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition";

              if (!item.to) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    className={`${baseClassName} text-[var(--color-content)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-title)]`}
                  >
                    <Icon className="h-5 w-5" />
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
                        ? "bg-[var(--color-primary-light)] text-[var(--color-primary-hover)]"
                        : "text-[var(--color-content)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-title)]",
                    ].join(" ")
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex h-16 items-center justify-end border-b border-[var(--color-border)] bg-white px-6 shadow-sm">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="relative rounded-lg p-2 text-[var(--color-content)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-hover)]"
              >
                <BellRing className="h-5 w-5" />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
              </button>

              <div className="flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-primary-soft)] px-2 py-1 pr-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">
                  {initials}
                </div>
                <span className="text-sm font-medium text-[var(--color-content)]">{userName}</span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </header>

          <div className="flex-1 p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
