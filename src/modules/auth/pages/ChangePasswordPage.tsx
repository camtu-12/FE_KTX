import axios from "axios";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../../../api/changePasswordApi";
import { clearAuthStorage } from "../utils/authStorage";

const MIN_PASSWORD_LENGTH = 6;

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder: string;
  error?: string;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-[#6d7fa6]">{label}</label>
      <div className="flex h-12 items-center gap-3 rounded-2xl border border-[#d6e2f1] bg-white px-4 transition duration-200 focus-within:border-[#244cb8] focus-within:ring-4 focus-within:ring-[#244cb8]/12">
        <KeyRound className="h-4 w-4 flex-shrink-0 text-[#7c8fb5]" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="new-password"
          className="w-full bg-transparent text-sm font-semibold text-[#1b3766] outline-none placeholder:font-normal placeholder:text-[#9aabc9]"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="flex-shrink-0 text-[#7c8fb5] transition hover:text-[#244cb8]"
          aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p className="mt-1.5 text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const newPasswordTooShort = newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;
  const newPasswordSameAsCurrent =
    newPassword.length > 0 && currentPassword.length > 0 && newPassword === currentPassword;
  const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  const isValid =
    currentPassword.trim().length > 0 &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    !newPasswordSameAsCurrent &&
    confirmPassword.length > 0 &&
    !confirmMismatch;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setGeneralError("");
    setSuccessMessage("");

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });

      setSuccessMessage("Đổi mật khẩu thành công, vui lòng đăng nhập lại.");

      setTimeout(() => {
        clearAuthStorage();
        navigate("/login");
      }, 1500);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      setGeneralError(message || "Đổi mật khẩu thất bại. Vui lòng thử lại.");
      setIsSubmitting(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: "easeOut" }}
        className="rounded-[28px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 text-[#1a2d52] shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:px-8"
      >
        <p className="text-sm font-semibold text-[#5C7094]">Bảo mật tài khoản</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-[32px]">Đổi mật khẩu</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, delay: 0.06, ease: "easeOut" }}
        className="mx-auto max-w-xl rounded-[26px] border border-[#c4d7f3] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:p-6"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            label="Mật khẩu hiện tại"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggleShow={() => setShowCurrent((prev) => !prev)}
            placeholder="Nhập mật khẩu hiện tại"
            disabled={isSubmitting}
          />

          <PasswordField
            label="Mật khẩu mới"
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggleShow={() => setShowNew((prev) => !prev)}
            placeholder={`Tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`}
            disabled={isSubmitting}
            error={
              newPasswordTooShort
                ? `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`
                : newPasswordSameAsCurrent
                  ? "Mật khẩu mới không được trùng mật khẩu hiện tại."
                  : undefined
            }
          />

          <PasswordField
            label="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            onToggleShow={() => setShowConfirm((prev) => !prev)}
            placeholder="Nhập lại mật khẩu mới"
            disabled={isSubmitting}
            error={confirmMismatch ? "Mật khẩu xác nhận không khớp." : undefined}
          />

          {generalError ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
              {generalError}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="auth-btn-gloss flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_56%,#31b7d4_100%)] text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="auth-btn-gloss__content">Đang lưu...</span>
              </>
            ) : (
              <span className="auth-btn-gloss__content">Lưu thay đổi</span>
            )}
          </button>
        </form>
      </motion.div>
    </motion.section>
  );
}
