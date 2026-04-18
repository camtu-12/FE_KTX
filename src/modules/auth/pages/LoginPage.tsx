import AuthShell from "../components/AuthShell";
import LoginForm from "../components/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Quản lý nội trú dễ dàng"
      title="Chào mừng trở lại !"
      description="Theo dõi hồ sơ nội trú, hợp đồng, tình trạng thanh toán và thông báo mới nhất."
    >
      <LoginForm />
    </AuthShell>
  );
}
