import {
  LayoutDashboard,
  UserCog,
  FilePenLine,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";

type SidebarRole = "admin" | "student";

type SidebarProps = {
  role: SidebarRole;
};

type MenuItem = {
  label: string;
  to: string;
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
];

export default function Sidebar({ role }: SidebarProps) {
  const items = role === "admin" ? adminMenu : studentMenu;

  return (
    <aside className="w-72 border-r border-[var(--color-border)] bg-white px-5 py-6">
      <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-primary-soft)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-hover)]">
          STU
        </p>
        <h1 className="mt-1 text-xl font-bold text-[var(--color-title)]">STU Dormitory</h1>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
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
  );
}
