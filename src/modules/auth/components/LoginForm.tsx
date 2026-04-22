import { useState } from "react";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const fieldClassName =
  "group flex h-14 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-input)] px-4 transition duration-200 focus-within:border-[var(--color-primary)] focus-within:bg-white focus-within:ring-4 focus-within:ring-[var(--color-primary-light)]";

const inputClassName =
  "h-full w-full bg-transparent text-base text-[var(--color-title)] outline-none placeholder:text-[#8b97ad]";

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    let hasError = false;

    setGeneralError("");
    setEmailError("");
    setPasswordError("");

    if (!trimmedEmail) {
      setEmailError("Vui lòng nhập email đăng nhập.");
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Email không hợp lệ.");
      hasError = true;
    }

    if (!trimmedPassword) {
      setPasswordError("Vui lòng nhập mật khẩu.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      const nextPath =
        res.user.role === "admin"
          ? "/admin/dashboard"
          : "/student/dashboard";

      navigate(nextPath);
    } catch {
      setGeneralError("Tài khoản hoặc mật khẩu không đúng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-4 shadow-[0_14px_42px_rgba(36,76,184,0.10)] sm:p-5">
        <div>
          <div className="max-w-[315px]">
            <h2 className="auth-display text-[2.08rem] font-bold text-[var(--color-title)] sm:text-[1.78rem]">
              Đăng nhập
            </h2>
            <p className="mt-1.5 text-[0.92rem] leading-7 text-[var(--color-content)]">
              Nhập thông tin tài khoản của bạn để tiếp tục.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-3"
          aria-busy={isSubmitting}
          autoComplete="off"
        >
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

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-content)] sm:text-sm">
              Email
            </label>
            <div className={fieldClassName}>
              <Mail size={18} className="text-[var(--color-primary)]" />
              <input
                name="email"
                autoComplete="email"
                readOnly
                onFocus={(e) => ((e.target as HTMLInputElement).readOnly = false)}
                type="email"
                placeholder="Nhập email của bạn"
                className={inputClassName}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                  if (generalError) setGeneralError("");
                }}
                disabled={isSubmitting}
              />
            </div>
            {emailError ? (
              <p className="mt-2 text-sm font-medium text-[#d14343]">
                {emailError}
              </p>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-content)] sm:text-sm">
                Mật khẩu
              </label>
            </div>
            <div className={fieldClassName}>
              <Lock size={18} className="text-[var(--color-primary)]" />
              <input
                name="password"
                autoComplete="current-password"
                readOnly
                onFocus={(e) => ((e.target as HTMLInputElement).readOnly = false)}
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu"
                className={inputClassName}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                  if (generalError) setGeneralError("");
                }}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-[#7c88a0] transition hover:text-[var(--color-primary-hover)]"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordError ? (
              <p className="mt-2 text-sm font-medium text-[#d14343]">
                {passwordError}
              </p>
            ) : null}
          </div>

          {generalError ? (
            <p className="rounded-2xl border border-[#f4caca] bg-[#fff3f3] px-4 py-3 text-sm font-medium text-[#c53c3c]">
              {generalError}
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
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>

          <p className="pt-1 text-center text-[0.9rem] text-[var(--color-content)]">
            Chưa có tài khoản?{" "}
            <Link
              to="/register"
              className="font-extrabold text-[var(--color-primary)] transition hover:text-[var(--color-primary-hover)]"
            >
              Đăng ký ngay
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
