import { useState } from "react";
import { LoaderCircle, Lock, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    let hasError = false;

    setGeneralError("");
    setEmailError("");
    setPasswordError("");

    if (!trimmedEmail) {
      setEmailError("Vui lòng nhập email");
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Email không hợp lệ");
      hasError = true;
    }

    if (!trimmedPassword) {
      setPasswordError("Vui lòng nhập mật khẩu");
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
      setGeneralError("Tài khoản hoặc mật khẩu không đúng");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[460px] rounded-[32px] border border-[var(--color-border)] bg-white p-7 shadow-[0_22px_60px_rgba(79,199,212,0.10)] sm:p-9">
      <div>
        <h2 className="text-2xl font-heading font-extrabold text-[var(--color-title)]">
          Đăng nhập
        </h2>
        <p className="mt-3 leading-8 text-[var(--color-content)]">
          Nhập email và mật khẩu để tiếp tục sử dụng hệ thống ký túc xá.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5"
        aria-busy={isSubmitting}
        autoComplete="off"
      >
        {/* Hidden dummy inputs to mitigate browser autofill */}
        <input type="text" name="fake-username" autoComplete="username" className="hidden" />
        <input type="password" name="fake-password" autoComplete="current-password" className="hidden" />
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-content)]">
            Email
          </label>
          <div className="flex h-15 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary-soft)] px-4 transition focus-within:border-[var(--color-primary)] focus-within:ring-4 focus-within:ring-[var(--color-primary-light)]">
            <Mail size={18} className="text-[var(--color-primary-hover)]" />
            <input
              name="email"
              autoComplete="email"
              readOnly
              onFocus={(e) => ((e.target as HTMLInputElement).readOnly = false)}
              type="email"
              placeholder="example@email.com"
              className="h-full w-full bg-transparent text-lg text-[var(--color-title)] outline-none placeholder:text-slate-400"
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
            <p className="mt-2 text-sm font-medium text-red-500">{emailError}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-content)]">
            Mật khẩu
          </label>
          <div className="flex h-15 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary-soft)] px-4 transition focus-within:border-[var(--color-primary)] focus-within:ring-4 focus-within:ring-[var(--color-primary-light)]">
            <Lock size={18} className="text-[var(--color-primary-hover)]" />
            <input
              name="password"
              autoComplete="current-password"
              readOnly
              onFocus={(e) => ((e.target as HTMLInputElement).readOnly = false)}
              type="password"
              placeholder="Nhập mật khẩu"
              className="h-full w-full bg-transparent text-lg text-[var(--color-title)] outline-none placeholder:text-slate-400"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
                if (generalError) setGeneralError("");
              }}
              disabled={isSubmitting}
            />
          </div>
          {passwordError ? (
            <p className="mt-2 text-sm font-medium text-red-500">
              {passwordError}
            </p>
          ) : null}
        </div>

        {generalError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {generalError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-15 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#58CAD8_0%,#32B4C2_100%)] px-4 text-lg font-bold text-white shadow-[0_16px_30px_rgba(79,199,212,0.22)] transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-80"
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

        <p className="pt-2 text-center text-lg text-[var(--color-content)]">
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            className="font-bold text-[var(--color-primary-hover)] transition hover:text-[var(--color-primary)]"
          >
            Đăng ký ngay
          </Link>
        </p>
      </form>
    </div>
  );
}
