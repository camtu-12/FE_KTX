import { NavLink, Outlet } from "react-router-dom";
import AppBrand from "../components/AppBrand";

export default function PublicLayout() {
  return (
    <div className="auth-font min-h-screen bg-[radial-gradient(circle_at_top_left,#f7faff_0%,#edf2f8_42%,#e8eef7_100%)] text-[var(--color-content)]">
      <header className="sticky top-0 z-30 border-b border-[#d9e5f5]/80 bg-white/88 shadow-[0_8px_24px_rgba(17,40,97,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-[4.75rem] w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <NavLink
            to="/"
            className="inline-flex min-w-0 items-center transition-transform duration-300 ease-out hover:-translate-y-0.5"
          >
            <span className="origin-left scale-[0.78] sm:scale-[0.88] lg:scale-[0.92]">
              <AppBrand />
            </span>
          </NavLink>

          <div className="flex shrink-0 items-center gap-3 lg:gap-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <NavLink
                to="/login"
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#c9d8f1] bg-white/82 px-4 text-sm font-bold text-[var(--color-primary-hover)] shadow-[0_8px_18px_rgba(17,40,97,0.05)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:shadow-[0_14px_26px_rgba(36,76,184,0.14)] sm:h-11 sm:px-5"
              >
                Đăng nhập
              </NavLink>

              <NavLink
                to="/register"
                className="inline-flex h-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-primary)_0%,#2d58c4_68%,#31b7d4_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(36,76,184,0.22)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_18px_34px_rgba(36,76,184,0.28)] active:translate-y-0 sm:h-11 sm:px-5"
              >
                Đăng ký
              </NavLink>
            </div>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
