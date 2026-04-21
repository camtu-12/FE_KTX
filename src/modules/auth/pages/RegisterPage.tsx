import AuthShell from "../components/AuthShell";
import RegisterForm from "../components/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Đăng ký hồ sơ sinh viên"
      title="Bắt đầu với tài khoản STU để đăng ký nội trú nhanh chóng."
      description="Dữ liệu bạn nhập sẽ được dùng cho hồ sơ, xét duyệt và phân phòng."
    >
      <RegisterForm />
    </AuthShell>
  );
}
