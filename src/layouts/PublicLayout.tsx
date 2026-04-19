import { NavLink, Outlet } from "react-router-dom";
import topbarLogo from "../assets/STU-topbar.png";

const navItems = [
  { label: "Trang chủ", to: "/" },
  { label: "Giới thiệu", to: "/about" },
  { label: "Liên hệ", to: "/contact" },
];

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-content)]">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-white shadow-sm">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
          <NavLink to="/" className="inline-flex items-center">
            <img
              src={topbarLogo}
              alt="STU Dormitory"
              className="h-12 w-auto object-contain"
            />
          </NavLink>

          <nav className="flex items-center gap-12">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  [
                      "text-base font-semibold transition-colors",
                    isActive
                      ? "text-[var(--color-primary-hover)]"
                      : "text-slate-600 hover:text-[var(--color-primary)]",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}

            <NavLink
              to="/login"
              className="rounded-lg border border-[var(--color-primary)] px-3 py-2 text-base font-semibold text-[var(--color-primary-hover)] transition hover:bg-[var(--color-primary-soft)]"
            >
              Đăng nhập
            </NavLink>

            <NavLink
              to="/register"
              className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-base font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"

            >
              Đăng ký
            </NavLink>
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
