import { NavLink, Outlet } from "react-router-dom";
import AppBrand from "../components/AppBrand";

export default function PublicLayout() {
  return (
    <div className="auth-font min-h-screen bg-[radial-gradient(circle_at_top_left,#f7faff_0%,#edf2f8_42%,#e8eef7_100%)] text-[var(--color-content)]">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/82 backdrop-blur-xl shadow-[0_18px_40px_rgba(15,23,42,0.09)]">
        <div className="mx-auto flex min-h-[5.5rem] w-full max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <NavLink
            to="/"
            className="inline-flex items-center transition-transform duration-300 ease-out hover:-translate-y-0.5"
          >
            <AppBrand />
          </NavLink>

          <div className="flex items-center gap-4 lg:gap-8">
            <div className="flex items-center gap-3">
              <NavLink
                to="/login"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#c9d8f1] bg-white/78 px-5 text-base font-semibold text-[var(--color-primary-hover)] shadow-[0_10px_24px_rgba(17,40,97,0.06)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:shadow-[0_18px_34px_rgba(36,76,184,0.16)]"
              >
                Đăng nhập
              </NavLink>

              <NavLink
                to="/register"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-primary)_0%,#2d58c4_70%,#31b7d4_100%)] px-5 text-base font-semibold text-white shadow-[0_16px_32px_rgba(36,76,184,0.24)] transition-all duration-300 ease-out hover:-translate-y-1 hover:brightness-110 hover:shadow-[0_22px_40px_rgba(36,76,184,0.30)]"
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
