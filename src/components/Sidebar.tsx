import {
  BedDouble,
  BedSingle,
  ClipboardList,
  CreditCard,
  FileCheck2,
  FilePenLine,
  LayoutDashboard,
  School,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";

export type SidebarRole = "admin" | "student";

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
    label: "Quản lý đăng ký",
    to: "/admin/registrations",
    icon: ClipboardList,
  },
  {
    label: "Phân phòng",
    to: "/admin/assign-room",
    icon: BedSingle,
  },
  {
    label: "Phân giường",
    to: "/admin/bed-management",
    icon: BedDouble,
  },
  {
    label: "Quản lý phòng",
    to: "/admin/rooms",
    icon: School,
  },
  {
    label: "Quản lý sinh viên",
    to: "/admin/students",
    icon: UserCog ,
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
  {
    label: "Phòng của tôi",
    to: "/student/room",
    icon: BedSingle,
  },
  {
    label: "Hợp đồng",
    to: "/student/contract",
    icon: FileCheck2,
  },
  {
    label: "Thanh toán",
    to: "/student/payment",
    icon: CreditCard,
  },
];

export default function Sidebar({ role }: SidebarProps) {
  const items = role === "admin" ? adminMenu : studentMenu;

  return (
    <aside className="relative flex w-[260px] flex-col overflow-hidden border-r border-[#173a82] bg-[linear-gradient(160deg,#173979_0%,#2450b0_46%,#12316f_100%)] p-4 text-white shadow-[16px_0_34px_rgba(17,40,97,0.32)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_82%_14%,rgba(120,166,255,0.16),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.10),transparent_24%)]" />
      <div className="pointer-events-none absolute -left-28 top-14 h-64 w-64 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-10 top-[-1.5rem] h-28 w-28 rounded-full bg-white/8 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-3.5rem] left-[18%] h-36 w-36 rounded-full bg-[#9fc0ff]/16 blur-3xl" />

      <div className="relative z-10 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <nav className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "group relative flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left text-sm font-semibold text-[#d6e7ff] transition-all duration-300",
                    isActive
                      ? "border-l-4 border-white bg-[linear-gradient(135deg,#5d83d8_0%,#7fe1d7_100%)] text-white shadow-[0_16px_30px_rgba(26,132,217,0.30)]"
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
                        isActive ? "text-white" : "text-[#b7d1f5] group-hover:text-white"
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
    </aside>
  );
}
