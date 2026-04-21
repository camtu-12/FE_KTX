import type { ReactNode } from "react";
import { Building2, Home } from "lucide-react";
import { Link } from "react-router-dom";
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
    <div className="auth-font flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,#f7faff_0%,#edf2f8_42%,#e8eef7_100%)]">
      <header className="border-b border-[#dbe4f0] bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link to="/login" className="flex items-center gap-3 text-[#14377b]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#14377b_0%,#2d58c4_100%)] shadow-[0_12px_24px_rgba(20,55,123,0.18)]">
              <Building2 size={24} strokeWidth={2.2} className="text-white" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d7ea6]">
                STU Dormitory
              </div>
              <div className="auth-display text-xl font-extrabold text-[#14377b]">
                Hệ thống quản lý ký túc xá
              </div>
            </div>
          </Link>

          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c7d6ee] bg-[#f8fbff] text-[#244cb8] shadow-[0_8px_22px_rgba(36,76,184,0.12)] transition hover:-translate-y-0.5 hover:text-[#173d97]"
            aria-label="Về trang chủ"
          >
            <Home size={22} strokeWidth={2.2} />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center px-4 py-4 sm:px-6 lg:px-8 lg:py-4">
        <section className="mx-auto w-full max-w-[920px] overflow-hidden rounded-[24px] border border-[#dce5f1] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
          <div className="grid lg:grid-cols-[0.78fr_0.92fr]">
            <div className="min-w-0">
              <AuthShowcase
                eyebrow={eyebrow}
                title={title}
                description={description}
              />
            </div>

            <div className="flex min-w-0 items-center bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] px-4 py-4 sm:px-5 sm:py-5 lg:px-5 lg:py-5">
              {children}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
