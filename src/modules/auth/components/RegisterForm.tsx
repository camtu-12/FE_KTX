import { useState, useEffect } from "react";
import {
  BookOpen,
  CreditCard,
  House,
  LoaderCircle,
  Lock,
  Mail,
  Phone,
  User,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

type RegisterFields = {
  studentCode: string;
  fullName: string;
  gender: "male" | "female";
  className: string;
  faculty: string;
  phone: string;
  email: string;
  cccd: string;
  permanentAddress: string;
  password: string;
  parentName: string;
  parentPhone: string;
  parentRelationship: string;
  confirmPassword: string;
};

type FieldErrors = Partial<Record<keyof RegisterFields, string>>;

const initialFields: RegisterFields = {
  studentCode: "",
  fullName: "",
  gender: "male",
  className: "",
  faculty: "",
  phone: "",
  email: "",
  cccd: "",
  permanentAddress: "",
  password: "",
  parentName: "",
  parentPhone: "",
  parentRelationship: "",
  confirmPassword: "",
};

export default function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState<RegisterFields>(initialFields);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear possible browser autofill values on mount (override autofill)
  useEffect(() => {
    const t = setTimeout(() => setFields(initialFields), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      studentCode: fields.studentCode.trim(),
      fullName: fields.fullName.trim(),
      className: fields.className.trim(),
      faculty: fields.faculty.trim(),
      phone: fields.phone.trim(),
      email: fields.email.trim(),
      cccd: fields.cccd.trim(),
      permanentAddress: fields.permanentAddress.trim(),
      password: fields.password.trim(),
      parentName: fields.parentName.trim(),
      parentPhone: fields.parentPhone.trim(),
      parentRelationship: fields.parentRelationship.trim(),
      confirmPassword: fields.confirmPassword.trim(),
    };

    if (!trimmed.studentCode) nextErrors.studentCode = "Vui lòng nhập MSSV";
    if (!trimmed.fullName) nextErrors.fullName = "Vui lòng nhập họ và tên";
    if (!trimmed.className) nextErrors.className = "Vui lòng nhập lớp";
    if (!trimmed.faculty) nextErrors.faculty = "Vui lòng nhập khoa";
    if (!trimmed.phone) {
      nextErrors.phone = "Vui lòng nhập số điện thoại";
    } else if (!/^\d{10,11}$/.test(trimmed.phone)) {
      nextErrors.phone = "Số điện thoại không hợp lệ";
    }

    if (!trimmed.email) {
      nextErrors.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.email)) {
      nextErrors.email = "Email không hợp lệ";
    }

    if (!trimmed.cccd) {
      nextErrors.cccd = "Vui lòng nhập CCCD";
    } else if (!/^\d{12}$/.test(trimmed.cccd)) {
      nextErrors.cccd = "CCCD phải gồm 12 số";
    }

    if (!trimmed.permanentAddress) {
      nextErrors.permanentAddress = "Vui lòng nhập địa chỉ thường trú";
    }

    if (!trimmed.password) {
      nextErrors.password = "Vui lòng nhập mật khẩu";
    } else if (trimmed.password.length < 6) {
      nextErrors.password = "Mật khẩu cần ít nhất 6 ký tự";
    }

    if (!trimmed.confirmPassword) {
      nextErrors.confirmPassword = "Vui lòng nhập lại mật khẩu";
    } else if (trimmed.confirmPassword !== trimmed.password) {
      nextErrors.confirmPassword = "Mật khẩu nhập lại không khớp";
    }

    if (!trimmed.parentName) {
      nextErrors.parentName = "Vui lòng nhập tên người thân";
    }

    if (!trimmed.parentPhone) {
      nextErrors.parentPhone = "Vui lòng nhập số điện thoại người thân";
    } else if (!/^\d{10,11}$/.test(trimmed.parentPhone)) {
      nextErrors.parentPhone = "Số điện thoại người thân không hợp lệ";
    }

    if (!trimmed.parentRelationship) {
      nextErrors.parentRelationship = "Vui lòng nhập mối quan hệ";
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
        studentCode: trimmed.studentCode,
        fullName: trimmed.fullName,
        gender: fields.gender,
        className: trimmed.className,
        faculty: trimmed.faculty,
        phone: trimmed.phone,
        email: trimmed.email,
        cccd: trimmed.cccd,
        permanentAddress: trimmed.permanentAddress,
        password: trimmed.password,
        parentName: trimmed.parentName,
        parentPhone: trimmed.parentPhone,
        parentRelationship: trimmed.parentRelationship,
      });
      setSuccessMessage(
        "Đăng ký thành công. Vui lòng đăng nhập bằng email vừa tạo."
      );
      setTimeout(() => navigate("/login"), 900);
    } catch (error) {
      setGeneralError(
        error instanceof Error ? error.message : "Đăng ký thất bại"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    "h-14 w-full bg-transparent text-base text-[var(--color-title)] outline-none placeholder:text-slate-400";
  const fieldClassName =
    "flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary-soft)] px-4 transition focus-within:border-[var(--color-primary)] focus-within:ring-4 focus-within:ring-[var(--color-primary-light)]";

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full max-w-[760px] flex-col overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-white shadow-[0_20px_60px_rgba(56,184,200,0.10)]">
      <div className="shrink-0 border-b border-[var(--color-border)] bg-white px-7 py-7 sm:px-9">
        <h2 className="text-2xl font-extrabold text-[var(--color-title)]">
          Đăng ký tài khoản
        </h2>
        <p className="mt-3 leading-8 text-[var(--color-content)]">
          Điền đầy đủ thông tin theo hồ sơ sinh viên và người thân để tạo tài
          khoản.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="auth-scrollbar flex-1 overflow-y-auto px-7 py-7 sm:px-9"
        autoComplete="off"
      >
        {/* Hidden fields to mitigate browser autofill (Chrome) */}
        <input type="text" name="fake-username" autoComplete="username" className="hidden" />
        <input type="password" name="fake-password" autoComplete="current-password" className="hidden" />
        <div className="space-y-8">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-content)]">
              Thông tin sinh viên
            </h3>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--color-content)]">
                  MSSV
                </label>
                <div className={fieldClassName}>
                  <BookOpen size={18} className="text-[var(--color-primary-hover)]" />
                  <input
                    name="studentCode"
                    autoComplete="off"
                    type="text"
                    placeholder="VD: DH52100001"
                    className={inputClassName}
                    value={fields.studentCode}
                    onChange={(e) => setField("studentCode", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.studentCode ? (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {errors.studentCode}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--color-content)]">
                  Họ và tên
                </label>
                <div className={fieldClassName}>
                  <User size={18} className="text-[var(--color-primary-hover)]" />
                  <input
                    name="fullName"
                    autoComplete="name"
                    readOnly
                    onFocus={(e) => ((e.target as HTMLInputElement).readOnly = false)}
                    type="text"
                    placeholder="Nguyễn Văn A"
                    className={inputClassName}
                    value={fields.fullName}
                    onChange={(e) => setField("fullName", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.fullName ? (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {errors.fullName}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--color-content)]">
                  Giới tính
                </label>
                <select
                  name="gender"
                  autoComplete="sex"
                  className="h-14 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary-soft)] px-4 text-base text-[var(--color-title)] outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-light)]"
                  value={fields.gender}
                  onChange={(e) =>
                    setField("gender", e.target.value as "male" | "female")
                  }
                  disabled={isSubmitting}
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--color-content)]">
                  Lớp
                </label>
                <div className={fieldClassName}>
                  <BookOpen size={18} className="text-[var(--color-primary-hover)]" />
                  <input
                    name="className"
                    autoComplete="organization" 
                    type="text"
                    placeholder="D21_TH01"
                    className={inputClassName}
                    value={fields.className}
                    onChange={(e) => setField("className", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.className ? (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {errors.className}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--color-content)]">
                  Khoa
                </label>
                <div className={fieldClassName}>
                  <BookOpen size={18} className="text-[var(--color-primary-hover)]" />
                  <input
                    name="faculty"
                    autoComplete="organization" 
                    type="text"
                    placeholder="Công nghệ thông tin"
                    className={inputClassName}
                    value={fields.faculty}
                    onChange={(e) => setField("faculty", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.faculty ? (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {errors.faculty}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--color-content)]">
                  Số điện thoại
                </label>
                <div className={fieldClassName}>
                  <Phone size={18} className="text-[var(--color-primary-hover)]" />
                  <input
                    name="phone"
                    autoComplete="tel"
                    type="text"
                    placeholder="0901234567"
                    className={inputClassName}
                    value={fields.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.phone ? (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {errors.phone}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--color-content)]">
                  Email
                </label>
                <div className={fieldClassName}>
                  <Mail size={18} className="text-[var(--color-primary-hover)]" />
                  <input
                    name="email"
                    autoComplete="email"
                    readOnly
                    onFocus={(e) => ((e.target as HTMLInputElement).readOnly = false)}
                    type="email"
                    placeholder="sv001@stu.edu.vn"
                    className={inputClassName}
                    value={fields.email}
                    onChange={(e) => setField("email", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email ? (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--color-content)]">
                  CCCD
                </label>
                <div className={fieldClassName}>
                  <CreditCard size={18} className="text-[var(--color-primary-hover)]" />
                  <input
                    name="cccd"
                    autoComplete="off"
                    type="text"
                    placeholder="001099123456"
                    className={inputClassName}
                    value={fields.cccd}
                    onChange={(e) => setField("cccd", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.cccd ? (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {errors.cccd}
                  </p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-semibold text-[var(--color-content)]">
                  Địa chỉ thường trú
                </label>
                <div className={fieldClassName}>
                  <House size={18} className="text-[var(--color-primary-hover)]" />
                  <input
                    name="permanentAddress"
                    autoComplete="street-address"
                    type="text"
                    placeholder="123 Trần Phú, Hải Châu, Đà Nẵng"
                    className={inputClassName}
                    value={fields.permanentAddress}
                    onChange={(e) => setField("permanentAddress", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.permanentAddress ? (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {errors.permanentAddress}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-content)]">
              Tài khoản và người thân
            </h3>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--color-content)]">
                  Mật khẩu
                </label>
                <div className={fieldClassName}>
                  <Lock size={18} className="text-[var(--color-primary-hover)]" />
                  <input
                    name="password"
                    autoComplete="new-password"
                    readOnly
                    onFocus={(e) => ((e.target as HTMLInputElement).readOnly = false)}
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    className={inputClassName}
                    value={fields.password}
                    onChange={(e) => setField("password", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.password ? (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {errors.password}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--color-content)]">
                  Nhập lại mật khẩu
                </label>
                <div className={fieldClassName}>
                  <Lock size={18} className="text-[var(--color-primary-hover)]" />
                  <input
                    name="confirmPassword"
                    autoComplete="new-password"
                    readOnly
                    onFocus={(e) => ((e.target as HTMLInputElement).readOnly = false)}
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    className={inputClassName}
                    value={fields.confirmPassword}
                    onChange={(e) => setField("confirmPassword", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.confirmPassword ? (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {errors.confirmPassword}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--color-content)]">
                  Tên người thân
                </label>
                <div className={fieldClassName}>
                  <Users size={18} className="text-[var(--color-primary-hover)]" />
                  <input
                    type="text"
                    placeholder="Nguyễn Văn B"
                    className={inputClassName}
                    value={fields.parentName}
                    onChange={(e) => setField("parentName", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.parentName ? (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {errors.parentName}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--color-content)]">
                  SĐT người thân
                </label>
                <div className={fieldClassName}>
                  <Phone size={18} className="text-[var(--color-primary-hover)]" />
                  <input
                    type="text"
                    placeholder="0901234568"
                    className={inputClassName}
                    value={fields.parentPhone}
                    onChange={(e) => setField("parentPhone", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.parentPhone ? (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {errors.parentPhone}
                  </p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-semibold text-[var(--color-content)]">
                  Mối quan hệ
                </label>
                <div className={fieldClassName}>
                  <Users size={18} className="text-[var(--color-primary-hover)]" />
                  <input
                    type="text"
                    placeholder="Cha / Mẹ / Anh / Chị"
                    className={inputClassName}
                    value={fields.parentRelationship}
                    onChange={(e) => setField("parentRelationship", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.parentRelationship ? (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {errors.parentRelationship}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {generalError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {generalError}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-15 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#58CAD8_0%,#32B4C2_100%)] px-4 text-xl font-bold text-white shadow-[0_16px_30px_rgba(79,199,212,0.22)] transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle size={20} className="animate-spin" />
                <span>Đang tạo tài khoản...</span>
              </>
            ) : (
              <span>Tạo tài khoản</span>
            )}
          </button>

          <p className="pt-2 text-center text-lg text-[var(--color-content)]">
            Đã có tài khoản?{" "}
            <Link
              to="/login"
              className="font-bold text-[var(--color-primary-hover)] transition hover:text-[var(--color-primary)]"
            >
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
