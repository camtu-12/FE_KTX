import AuthShell from "../components/AuthShell";
import LoginForm from "../components/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Cổng đăng nhập ký túc xá STU"
      title="Nền tảng quản lý ký túc xá toàn diện, từ đăng ký đến vận hành."
      description="Chào mừng bạn đến với hệ thống quản lý ký túc xá STU."
    >
      <div className="w-full max-w-[460px]">
        <LoginForm />
      </div>
    </AuthShell>
  );
}
