import type { ReactNode } from "react";
import { Home } from "lucide-react";
import { Link } from "react-router-dom";
import AppBrand from "../../../components/AppBrand";
import AuthShowcase from "./AuthShowcase";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <div className="auth-font flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,#f7faff_0%,#edf2f8_42%,#e8eef7_100%)]">
      <header className="border-b border-[#dbe4f0] bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/login" className="flex items-center gap-3 text-[#14377b]">
            <AppBrand />
          </Link>

          <Link
            to="/"
            title="Về trang chủ"
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2.5 rounded-full border border-[#c7d6ee] bg-[#f8fbff] px-5 text-[0.95rem] font-semibold text-[#244cb8] shadow-[0_8px_22px_rgba(36,76,184,0.12)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#b8caea] hover:bg-[#eef4ff] hover:text-[#173d97] focus-visible:border-[#b8caea] focus-visible:bg-[#eef4ff] focus-visible:text-[#173d97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#244cb8]/18"
            aria-label="Về trang chủ"
          >
            <Home size={19} strokeWidth={2.2} />
            <span>Trang chủ</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center px-4 py-2 sm:px-6 lg:px-8 lg:py-2">
        <section className="mx-auto w-full max-w-[860px] overflow-hidden rounded-[22px] border border-[#dce5f1] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
          <div className="grid lg:grid-cols-[0.78fr_0.92fr]">
            <div className="min-w-0">
              <AuthShowcase
                eyebrow={eyebrow}
                title={title}
                description={description}
              />
            </div>

            <div className="flex min-w-0 items-center bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] px-3 py-3 sm:px-4 sm:py-4 lg:px-4 lg:py-4">
              {children}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
