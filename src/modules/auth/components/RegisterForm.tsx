import { useState } from "react";
import {
  BookOpen,
  Eye,
  EyeOff,
  IdCard,
  LoaderCircle,
  Lock,
  Mail,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ApiHttpError, checkEmailExists, checkStudentCodeExists } from "../services/auth.api";

type RegisterFields = {
  full_name: string;
  student_code: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type FieldErrors = Partial<Record<keyof RegisterFields, string>>;

const initialFields: RegisterFields = {
  full_name: "",
  student_code: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const labelClassName =
  "mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#61708e]";

const inputClassName =
  "h-full w-full bg-transparent text-base text-[var(--color-title)] outline-none placeholder:text-[#8b97ad]";

const inputShellClassName =
  "group flex h-12 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-input)] px-4 transition duration-200 focus-within:border-[var(--color-primary)] focus-within:bg-white focus-within:ring-4 focus-within:ring-[var(--color-primary-light)]";

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClassName}>{label}</label>
      {children}
      {error ? <p className="mt-2 text-sm font-medium text-[#d14343]">{error}</p> : null}
    </div>
  );
}

function InputShell({
  icon: Icon,
  trailing,
  children,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={inputShellClassName}>
      {Icon && <Icon size={18} className="text-[#4666ab]" />}
      {children}
      {trailing}
    </div>
  );
}

export default function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState<RegisterFields>(initialFields);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const setField = <K extends keyof RegisterFields>(
    key: K,
    value: RegisterFields[K]
  ) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    if (generalError) setGeneralError("");
  };

  const nameRegex = /^[A-Za-zÀ-ỹ\s]+$/;

  const studentCodeRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/;

  const emailRegex = /^[a-zA-Z0-9._%+-]+@student\.stu\.edu\.vn$/i;

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

  const handleEmailBlur = async () => {
    const email = fields.email.trim();
    if (!email) return;

    if (!emailRegex.test(email)) {
      setErrors((prev) => ({
        ...prev,
        email: "Email phải đúng định dạng abc@student.stu.edu.vn.",
      }));
      return;
    }

    try {
      const res = await checkEmailExists(email);
      if (res.exists) {
        setErrors((prev) => ({ ...prev, email: "Email đã tồn tại." }));
      }
    } catch { }
  };

  const handleStudentCodeBlur = async () => {
    const code = fields.student_code.trim();
    if (!code) return;

    if (!studentCodeRegex.test(code)) {
      setErrors((prev) => ({
        ...prev,
        student_code: "MSSV phải gồm chữ và số, không chứa ký tự đặc biệt.",
      }));
      return;
    }

    try {
      const res = await checkStudentCodeExists(code);
      if (res.exists) {
        setErrors((prev) => ({
          ...prev,
          student_code: "MSSV đã tồn tại.",
        }));
      }
    } catch { }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextErrors: FieldErrors = {};

    const trimmed = {
      full_name: fields.full_name.trim(),
      student_code: fields.student_code.trim(),
      email: fields.email.trim(),
      password: fields.password.trim(),
      confirmPassword: fields.confirmPassword.trim(),
    };

    // Họ và tên
    if (!trimmed.full_name) {
      nextErrors.full_name = "Vui lòng nhập họ và tên.";
    } else if (!nameRegex.test(trimmed.full_name)) {
      nextErrors.full_name =
        "Họ tên chỉ được chứa chữ cái, không có số hoặc ký tự đặc biệt.";
    }

    // MSSV
    if (!trimmed.student_code) {
      nextErrors.student_code = "Vui lòng nhập MSSV.";
    } else if (!studentCodeRegex.test(trimmed.student_code)) {
      nextErrors.student_code =
        "MSSV phải gồm chữ và số, không chứa ký tự đặc biệt.";
    }

    // Email (chỉ student.stu.edu.vn)
    if (!trimmed.email) {
      nextErrors.email = "Vui lòng nhập email.";
    } else if (!emailRegex.test(trimmed.email)) {
      nextErrors.email = "Email phải đúng định dạng abc@student.stu.edu.vn.";
    }

    // Mật khẩu
    if (!trimmed.password) {
      nextErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (!passwordRegex.test(trimmed.password)) {
      nextErrors.password =
        "Mật khẩu phải nhiều hơn 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.";
    }

    // Xác nhận mật khẩu
    if (!trimmed.confirmPassword) {
      nextErrors.confirmPassword = "Vui lòng nhập lại mật khẩu.";
    } else if (trimmed.confirmPassword !== trimmed.password) {
      nextErrors.confirmPassword = "Mật khẩu không khớp.";
    }

    setErrors(nextErrors);
    setGeneralError("");
    setSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Sửa quan trọng: đúng key của backend
      await register({
        full_name: trimmed.full_name,
        student_code: trimmed.student_code,
        email: trimmed.email,
        password: trimmed.password,
        password_confirmation: trimmed.confirmPassword,
      });

      setSuccessMessage(
        "Tạo tài khoản thành công. Bạn có thể đăng nhập bằng email vừa khai báo."
      );

      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      if (error instanceof ApiHttpError) {
        const backendFieldErrors = error.fieldErrors as Record<string, string>;

        setErrors((prev) => ({
          ...prev,
          email: backendFieldErrors.email ?? prev.email,
          password: backendFieldErrors.password ?? prev.password,
          confirmPassword:
            backendFieldErrors.password_confirmation ?? prev.confirmPassword,
        }));

        setGeneralError(error.message || "Đăng ký thất bại.");
      } else {
        setGeneralError(
          error instanceof Error ? error.message : "Đăng ký thất bại."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[380px]">
      <form onSubmit={handleSubmit} autoComplete="off">
        <input
          type="text"
          name="fake-username"
          autoComplete="username"
          className="hidden"
        />
        <input
          type="password"
          name="fake-password"
          autoComplete="current-password"
          className="hidden"
        />

        <section className="rounded-[24px] border border-[#e3eaf4] bg-[#fbfcff] p-3.5 sm:p-4">
          <div>
            <h2 className="auth-display text-[1.72rem] font-bold text-[var(--color-title)] sm:text-[1.55rem]">
              Đăng ký tài khoản
            </h2>
            <p className="mt-1 text-[0.88rem] leading-[1.55] text-[var(--color-content)]">
              Tạo tài khoản đăng nhập vào hệ thống.
            </p>
          </div>

          <div className="mt-3 grid gap-2.5">
            <FormField label="Họ và tên" error={errors.full_name}>
              <InputShell icon={IdCard}>
                <input
                  name="full_name"
                  autoComplete="name"
                  type="text"
                  placeholder="Nhập họ và tên"
                  className={inputClassName}
                  value={fields.full_name}
                  onChange={(e) => setField("full_name", e.target.value)}
                  disabled={isSubmitting}
                />
              </InputShell>
            </FormField>

            <FormField label="MSSV" error={errors.student_code}>
              <InputShell icon={BookOpen}>
                <input
                  name="student_code"
                  autoComplete="off"
                  type="text"
                  placeholder="Nhập MSSV"
                  className={inputClassName}
                  value={fields.student_code}
                  onChange={(e) => setField("student_code", e.target.value)}
                  onBlur={handleStudentCodeBlur}
                  disabled={isSubmitting}
                />
              </InputShell>
            </FormField>

            <FormField label="Email" error={errors.email}>
              <InputShell icon={Mail}>
                <input
                  name="email"
                  autoComplete="email"
                  readOnly
                  onFocus={(e) => ((e.target as HTMLInputElement).readOnly = false)}
                  type="email"
                  placeholder="Nhập email
                  "
                  className={inputClassName}
                  value={fields.email}
                  onChange={(e) => setField("email", e.target.value)}
                  onBlur={handleEmailBlur}
                  disabled={isSubmitting}
                />
              </InputShell>
            </FormField>

            <FormField label="Mật khẩu" error={errors.password}>
              <InputShell
                icon={Lock}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-[#7c88a0] transition hover:text-[var(--color-primary-hover)]"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              >
                <input
                  name="password"
                  autoComplete="new-password"
                  readOnly
                  onFocus={(e) => ((e.target as HTMLInputElement).readOnly = false)}
                  type={showPassword ? "text" : "password"}
                  placeholder="Mật khẩu tối thiểu 8 ký tự"
                  className={inputClassName}
                  value={fields.password}
                  onChange={(e) => setField("password", e.target.value)}
                  disabled={isSubmitting}
                />
              </InputShell>
            </FormField>

            <FormField label="Xác nhận mật khẩu" error={errors.confirmPassword}>
              <InputShell
                icon={Lock}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="text-[#7c88a0] transition hover:text-[var(--color-primary-hover)]"
                    aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              >
                <input
                  name="confirmPassword"
                  autoComplete="new-password"
                  readOnly
                  onFocus={(e) => ((e.target as HTMLInputElement).readOnly = false)}
                  type={showConfirm ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu"
                  className={inputClassName}
                  value={fields.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                  disabled={isSubmitting}
                />
              </InputShell>
            </FormField>
          </div>

          {generalError ? (
            <p className="mt-2.5 rounded-2xl border border-[#f4caca] bg-[#fff3f3] px-4 py-2.5 text-sm font-medium text-[#c53c3c]">
              {generalError}
            </p>
          ) : null}

          {successMessage ? (
            <p className="mt-2.5 rounded-2xl border border-[#cfead5] bg-[#f2fbf4] px-4 py-2.5 text-sm font-medium text-[#2f7a45]">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--color-primary)_0%,#31b7d4_100%)] px-4 text-[0.98rem] font-extrabold text-white shadow-[0_14px_28px_rgba(36,76,184,0.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(36,76,184,0.28)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle size={20} className="animate-spin" />
                <span>Đang đăng ký...</span>
              </>
            ) : (
              <span>Đăng ký</span>
            )}
          </button>

          <p className="pt-1.5 text-center text-[0.88rem] text-[var(--color-content)]">
            Đã có tài khoản?{" "}
            <Link
              to="/login"
              className="font-extrabold text-[var(--color-primary)] transition hover:text-[var(--color-primary-hover)]"
            >
              Đăng nhập
            </Link>
          </p>
        </section>
      </form>
    </div>
  );
}
