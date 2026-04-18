import AuthShell from "../components/AuthShell";
import RegisterForm from "../components/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Student Account Registration"
      title="Thiết lập tài khoản để bắt đầu đăng ký nội trú."
      description="Dữ liệu đăng ký đồng bộ với hồ sơ sinh viên, hỗ trợ xét duyệt và quản lý hợp đồng."
    >
      <RegisterForm />
    </AuthShell>
  );
}
