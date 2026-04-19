import AuthShell from "../components/AuthShell";
import LoginForm from "../components/LoginForm";
import { House } from "lucide-react";
import { Link } from "react-router-dom";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Quản lý nội trú dễ dàng"
      title="Chào mừng trở lại !"
      description="Theo dõi hồ sơ nội trú, hợp đồng, tình trạng thanh toán và thông báo mới nhất."
    >
      <div className="relative w-full max-w-[460px]">
        <Link
          to="/"
          className="absolute right-5 top-5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/80 text-slate-600 shadow-sm transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
        >
          <House size={16} />
        </Link>
        <LoginForm />
      </div>
    </AuthShell>
  );
}
