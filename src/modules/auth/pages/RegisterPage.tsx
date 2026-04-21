import AuthShell from "../components/AuthShell";
import RegisterForm from "../components/RegisterForm";
import { House } from "lucide-react";
import { Link } from "react-router-dom";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Đăng ký hồ sơ sinh viên"
      title="Bắt đầu với tài khoản STU để đăng ký nội trú nhanh chóng."
      description="Dữ liệu bạn nhập sẽ được dùng cho hồ sơ, xét duyệt và phân phòng."
    >
      <div className="relative w-full max-w-[760px]">
        <Link
          to="/"
          className="absolute right-5 top-5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/80 text-slate-600 shadow-sm transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
        >
          <House size={16} />
        </Link>
        <RegisterForm />
      </div>
    </AuthShell>
  );
}
