import {
  BedSingle,
  Building2,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CreditCard,
  DoorOpen,
  FileText,
  FilePenLine,
  GraduationCap,
  History,
  Hotel,
  LayoutDashboard,
  LifeBuoy,
  School,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

export type SidebarRole = "admin" | "student";

type SidebarProps = {
  role: SidebarRole;
};

type MenuItem = {
  label: string;
  to?: string;
  icon: LucideIcon;
  children?: Array<{
    label: string;
    to: string;
  }>;
};

const adminMenu: MenuItem[] = [
  {
    label: "Dashboard",
    to: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Quản lý đăng ký",
    icon: ClipboardList,
    children: [
      { label: "Đợt đăng ký", to: "/admin/registration-periods" },
      { label: "Danh sách đơn", to: "/admin/registrations" },
    ],
  },
  {
    label: "Phân phòng",
    to: "/admin/assign-room",
    icon: DoorOpen,
  },
  {
    label: "Quản lý giường",
    to: "/admin/bed-management",
    icon: BedSingle,
  },
  {
    label: "Quản lý lưu trú",
    to: "/admin/occupancies",
    icon: Hotel,
  },
   {
    label: "Gia hạn lưu trú",
    icon: CalendarRange,
    children: [
      { label: "Đợt gia hạn", to: "/admin/occupancy-periods" },
      { label: "Yêu cầu gia hạn", to: "/admin/extensions" },
    ],
  },
  {
    label: "Quản lý thanh toán",
    icon: CreditCard,
    children: [
      {
        label: "Tiền phòng",
        to: "/admin/payments/room-fees",
      },
      {
        label: "Tiền điện",
        to: "/admin/payments/electricity",
      },
    ],
  },
  {
    label: "Quản lý hoạt động",
    icon: ShieldAlert,
    children: [
      {
        label: "Danh mục hoạt động",
        to: "/admin/violation-types",
      },
      {
        label: "Lịch sử hoạt động",
        to: "/admin/violations",
      },
    ],
  },
  
  {
    label: "Yêu cầu hỗ trợ",
    to: "/admin/support-requests",
    icon: LifeBuoy,
  },
 
  {
    label: "Quản lý tòa",
    to: "/admin/buildings",
    icon: Building2,
  },
  {
    label: "Quản lý phòng",
    to: "/admin/rooms",
    icon: School,
  },
  {
    label: "Tân sinh viên",
    icon: GraduationCap,
    children: [
      { label: "Hồ sơ trúng tuyển", to: "/admin/admission-candidates" },
      { label: "Hồ sơ giữ chỗ KTX", to: "/admin/dorm-reservations" },
    ],
  },
  {
    label: "Quản lý nội dung",
    to: "/admin/content/about",
    icon: FileText,
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
    to: "/student/room-status",
    icon: FilePenLine,
  },
  {
    label: "Phòng của tôi",
    to: "/student/room",
    icon: BedSingle,
  },
  {
    label: "Thanh toán",
    to: "/student/payment",
    icon: CreditCard,
  },
  {
    label: "Hoạt động của tôi",
    to: "/student/activities",
    icon: History,
  },
  {
    label: "Yêu cầu hỗ trợ",
    to: "/student/support",
    icon: LifeBuoy,
  },
  {
    label: "Gia hạn lưu trú",
    to: "/student/extension",
    icon: CalendarRange,
  },
];

export default function Sidebar({ role }: SidebarProps) {
  const items = role === "admin" ? adminMenu : studentMenu;
  const location = useLocation();
  const isRegistrationGroupActive =
    location.pathname === "/admin/registrations" || location.pathname === "/admin/registration-periods";
  const isViolationGroupActive =
    location.pathname === "/admin/violations" || location.pathname === "/admin/violation-types";
  const isPaymentGroupActive = location.pathname.startsWith("/admin/payments");
  const isExtensionGroupActive =
    location.pathname === "/admin/extensions" || location.pathname === "/admin/occupancy-periods";
  const isFreshmanGroupActive =
    location.pathname === "/admin/admission-candidates" || location.pathname === "/admin/dorm-reservations";
  const [isRegistrationGroupOpen, setIsRegistrationGroupOpen] = useState(isRegistrationGroupActive);
  const [isViolationGroupOpen, setIsViolationGroupOpen] = useState(isViolationGroupActive);
  const [isPaymentGroupOpen, setIsPaymentGroupOpen] = useState(isPaymentGroupActive);
  const [isExtensionGroupOpen, setIsExtensionGroupOpen] = useState(isExtensionGroupActive);
  const [isFreshmanGroupOpen, setIsFreshmanGroupOpen] = useState(isFreshmanGroupActive);

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

            if (item.children) {
              const isRegistrationGroup = item.label === "Quản lý đăng ký";
              const isPaymentGroup = item.label === "Quản lý thanh toán";
              const isViolationGroup = item.label === "Quản lý hoạt động";
              const isExtensionGroup = item.label === "Gia hạn lưu trú";
              const isFreshmanGroup = item.label === "Tân sinh viên";
              const isOpen = isRegistrationGroup
                ? isRegistrationGroupOpen || isRegistrationGroupActive
                : isViolationGroup
                  ? isViolationGroupOpen || isViolationGroupActive
                  : isPaymentGroup
                    ? isPaymentGroupOpen || isPaymentGroupActive
                    : isExtensionGroup
                      ? isExtensionGroupOpen || isExtensionGroupActive
                      : isFreshmanGroup
                        ? isFreshmanGroupOpen || isFreshmanGroupActive
                        : false;
              const isGroupActive =
                item.children.some((child) => child.to === location.pathname) ||
                (isPaymentGroup && isPaymentGroupActive);
              const ChevronIcon = isOpen ? ChevronUp : ChevronDown;

              return (
                <div key={item.label} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isRegistrationGroup) {
                        setIsRegistrationGroupOpen((current) => !current);
                      }
                      if (isViolationGroup) {
                        setIsViolationGroupOpen((current) => !current);
                      }
                      if (isPaymentGroup) {
                        setIsPaymentGroupOpen((current) => !current);
                      }
                      if (isExtensionGroup) {
                        setIsExtensionGroupOpen((current) => !current);
                      }
                      if (isFreshmanGroup) {
                        setIsFreshmanGroupOpen((current) => !current);
                      }
                    }}
                    className={[
                      "group relative flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left text-sm font-semibold text-[#d6e7ff] transition-all duration-300",
                      isGroupActive ? "bg-[#2563eb] text-white shadow-[0_14px_26px_rgba(37,99,235,0.26)]" : "hover:bg-white/15 hover:text-white",
                    ].join(" ")}
                  >
                    <span
                      className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded ${
                        isGroupActive ? "bg-white/70" : "bg-transparent"
                      }`}
                    ></span>
                    <Icon
                      className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
                        isGroupActive ? "text-white" : "text-[#b7d1f5] group-hover:text-white"
                      }`}
                    />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    <ChevronIcon
                      className={`h-4 w-4 flex-shrink-0 transition-colors duration-200 ${
                        isGroupActive ? "text-white" : "text-[#b7d1f5] group-hover:text-white"
                      }`}
                    />
                  </button>

                  {isOpen ? (
                    <div className="relative ml-5 space-y-2 pl-4">
                      <span className="absolute bottom-3 left-0 top-3 w-px rounded-full bg-white/18" />
                      {item.children.map((child) => {
                        return (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            className={({ isActive }) =>
                              [
                                "group relative flex w-full items-center gap-3 rounded-[18px] px-4 py-2.5 text-left text-sm font-semibold text-[#d6e7ff] transition-all duration-300",
                                isActive
                                  ? "bg-[#2563eb] text-white shadow-[0_12px_24px_rgba(37,99,235,0.24)]"
                                  : "hover:bg-white/15 hover:text-white",
                              ].join(" ")
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <span
                                  className={`absolute -left-[1.15rem] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${
                                    isActive ? "bg-white" : "bg-white/32"
                                  }`}
                                />
                                <span>{child.label}</span>
                              </>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to ?? "#"}
                className={({ isActive }) =>
                  [
                    "group relative flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left text-sm font-semibold text-[#d6e7ff] transition-all duration-300",
                    isActive
                      ? "border-l-4 border-white bg-[#2563eb] text-white shadow-[0_16px_30px_rgba(37,99,235,0.30)]"
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
