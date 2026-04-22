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

type RegisterFields = {
  fullName: string;
  studentCode: string;
  email: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof RegisterFields, string>>;

const initialFields: RegisterFields = {
  fullName: "",
  studentCode: "",
  email: "",
  password: "",
};

const labelClassName =
  "mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#61708e]";

const inputClassName =
  "h-full w-full bg-transparent text-base text-[var(--color-title)] outline-none placeholder:text-[#8b97ad]";

const inputShellClassName =
  "group flex h-14 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-input)] px-4 transition duration-200 focus-within:border-[var(--color-primary)] focus-within:bg-white focus-within:ring-4 focus-within:ring-[var(--color-primary-light)]";

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

  const setField = <K extends keyof RegisterFields>(
    key: K,
    value: RegisterFields[K]
  ) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    if (generalError) setGeneralError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextErrors: FieldErrors = {};
    const trimmed = {
      fullName: fields.fullName.trim(),
      studentCode: fields.studentCode.trim(),
      email: fields.email.trim(),
      password: fields.password.trim(),
    };

    if (!trimmed.fullName) {
      nextErrors.fullName = "Vui lòng nhập họ và tên.";
    }

    if (!trimmed.studentCode) {
      nextErrors.studentCode = "Vui lòng nhập MSSV.";
    }

    if (!trimmed.email) {
      nextErrors.email = "Vui lòng nhập email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.email)) {
      nextErrors.email = "Email không hợp lệ.";
    }

    if (!trimmed.password) {
      nextErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (trimmed.password.length < 6) {
      nextErrors.password = "Mật khẩu cần ít nhất 6 ký tự.";
    }

    setErrors(nextErrors);
    setGeneralError("");
    setSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        fullName: trimmed.fullName,
        studentCode: trimmed.studentCode,
        email: trimmed.email,
        password: trimmed.password,
      });

      setSuccessMessage(
        "Tạo tài khoản thành công. Bạn có thể đăng nhập bằng email vừa khai báo."
      );
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setGeneralError(
        error instanceof Error ? error.message : "Đăng ký thất bại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[400px]">
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

        <section className="rounded-[24px] border border-[#e3eaf4] bg-[#fbfcff] p-4 sm:p-5">
          <div>
            <h2 className="auth-display text-[2.08rem] font-bold text-[var(--color-title)] sm:text-[1.78rem]">
              Đăng ký tài khoản
            </h2>
            <p className="mt-1.5 text-[0.92rem] leading-7 text-[var(--color-content)]">
              Tạo tài khoản đăng nhập vào hệ thống.
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            <FormField label="Họ và tên" error={errors.fullName}>
              <InputShell icon={IdCard}>
                <input
                  name="fullName"
                  autoComplete="name"
                  type="text"
                  placeholder="Nhập họ và tên"
                  className={inputClassName}
                  value={fields.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                  disabled={isSubmitting}
                />
              </InputShell>
            </FormField>

            <FormField label="MSSV" error={errors.studentCode}>
              <InputShell icon={BookOpen}>
                <input
                  name="studentCode"
                  autoComplete="off"
                  type="text"
                  placeholder="Nhập MSSV"
                  className={inputClassName}
                  value={fields.studentCode}
                  onChange={(e) => setField("studentCode", e.target.value)}
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
                  placeholder="Nhập email"
                  className={inputClassName}
                  value={fields.email}
                  onChange={(e) => setField("email", e.target.value)}
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
                  placeholder="Nhập mật khẩu"
                  className={inputClassName}
                  value={fields.password}
                  onChange={(e) => setField("password", e.target.value)}
                  disabled={isSubmitting}
                />
              </InputShell>
            </FormField>
          </div>

          {generalError ? (
            <p className="mt-3 rounded-2xl border border-[#f4caca] bg-[#fff3f3] px-4 py-3 text-sm font-medium text-[#c53c3c]">
              {generalError}
            </p>
          ) : null}

          {successMessage ? (
            <p className="mt-3 rounded-2xl border border-[#cfead5] bg-[#f2fbf4] px-4 py-3 text-sm font-medium text-[#2f7a45]">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--color-primary)_0%,#31b7d4_100%)] px-4 text-[1rem] font-extrabold text-white shadow-[0_14px_28px_rgba(36,76,184,0.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(36,76,184,0.28)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-80"
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

          <p className="pt-2 text-center text-[0.9rem] text-[var(--color-content)]">
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
