import { useRef, useState } from "react";
import { AlertCircle, CheckCircle, Clock, ShieldCheck, UserCircle2, Users } from "lucide-react";

type RegistrationStatus = "unregistered" | "pending" | "approved" | "rejected";

interface FormData {
  mssv: string;
  fullName: string;
  gender: string;
  class: string;
  department: string;
  phone: string;
  cccd: string;
  address: string;
  relationName: string;
  relationPhone: string;
  relationship: string;
}

const initialFormData: FormData = {
  mssv: "",
  fullName: "",
  gender: "",
  class: "",
  department: "",
  phone: "",
  cccd: "",
  address: "",
  relationName: "",
  relationPhone: "",
  relationship: "",
};

const fieldLabels: Record<keyof FormData, string> = {
  mssv: "MSSV",
  fullName: "Họ và tên",
  gender: "Giới tính",
  class: "Lớp",
  department: "Khoa",
  phone: "Số điện thoại",
  cccd: "Số CCCD",
  address: "Địa chỉ thường trú",
  relationName: "Tên người thân",
  relationPhone: "Số điện thoại người thân",
  relationship: "Quan hệ",
};

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default function RegistrationPage() {
  const [status, setStatus] = useState<RegistrationStatus>("unregistered");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [rejectionReason, setRejectionReason] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const formRef = useRef<HTMLFormElement | null>(null);
  const fieldRefs = useRef<
    Partial<Record<keyof FormData, HTMLInputElement | HTMLSelectElement | null>>
  >({});

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof FormData;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => {
      if (!prev[fieldName]) {
        return prev;
      }

      const nextErrors = { ...prev };
      delete nextErrors[fieldName];
      return nextErrors;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields = Object.keys(fieldLabels) as Array<keyof FormData>;
    const nextErrors: Partial<Record<keyof FormData, string>> = {};

    for (const field of requiredFields) {
      if (!formData[field].trim()) {
        nextErrors[field] = `Vui lòng điền ${fieldLabels[field].toLowerCase()}`;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);

      const firstInvalidField = requiredFields.find((field) => nextErrors[field]);
      if (firstInvalidField) {
        fieldRefs.current[firstInvalidField]?.focus();
        fieldRefs.current[firstInvalidField]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }

      return;
    }

    // Mock submit - set to pending
    setErrors({});
    setStatus("pending");
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setStatus("unregistered");
    setRejectionReason("");
    setErrors({});
  };

  const handleClearForm = () => {
    setFormData(initialFormData);
    setErrors({});

    requestAnimationFrame(() => {
      if (formRef.current) {
        formRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const getFieldClassName = () =>
    "mt-1 h-11 w-full rounded-xl border-2 border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-title)] placeholder:text-slate-400 transition-all duration-200 hover:border-[var(--color-primary)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]";

  return (
    <section className="flex h-full flex-col space-y-6 overflow-hidden rounded-2xl bg-slate-50 p-4 sm:p-6">
      <div className="rounded-2xl border border-[var(--color-border)] bg-white px-6 py-5 shadow-[0_22px_60px_rgba(79,199,212,0.10)] transition-all duration-200 hover:-translate-y-0.5 sm:px-8 sm:py-4">
        <h1 className="text-[27px] font-bold text-[var(--color-title)]">Đăng ký nội trú</h1>
        <p className="mt-1.5 text-sm text-[var(--color-content)]">
          Hoàn thành biểu mẫu để gửi yêu cầu đăng ký nội trú. Hệ thống sẽ xét duyệt đơn của bạn
          trong vòng 3-5 ngày làm việc.
        </p>
      </div>

      {/* Status: Pending */}
      {status === "pending" && (
        <div className="flex items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
          <Clock className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="font-semibold text-yellow-900">Đơn của bạn đang được duyệt</p>
            <p className="text-sm text-yellow-700">
              Vui lòng chờ kết quả. Chúng tôi sẽ thông báo trong vòng 3-5 ngày làm việc.
            </p>
          </div>
        </div>
      )}

      {/* Status: Approved */}
      {status === "approved" && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-900">Đơn đăng ký đã được duyệt!</p>
            <p className="text-sm text-emerald-700">
              Chúc mừng! Bạn đã được chấp thuận đăng ký nội trú. Vui lòng liên hệ với phòng quản
              lý KTX để hoàn tất các thủ tục tiếp theo.
            </p>
          </div>
        </div>
      )}

      {/* Status: Rejected */}
      {status === "rejected" && (
        <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Đơn đăng ký bị từ chối</p>
              <p className="text-sm text-red-700">{rejectionReason}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
          >
            Gửi lại đơn
          </button>
        </div>
      )}

      {/* Form - Show only when unregistered or rejected */}
      {(status === "unregistered" || status === "rejected") && (
        <div className="flex-1 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white px-6 pb-6 pt-4 shadow-[0_22px_60px_rgba(79,199,212,0.10)] transition-all duration-200 sm:px-8 sm:pb-8 sm:pt-5">
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="h-full space-y-6 overflow-y-auto pr-2 auth-scrollbar"
          >
            {/* Section 1: Basic Information */}
            <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_22px_60px_rgba(79,199,212,0.10)] transition-colors duration-200 hover:bg-[var(--color-primary-soft)] sm:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary-hover)]">
                  <UserCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary-hover)]">
                      Bước 1
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--color-title)]">Thông tin cơ bản</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-content)]">
                    MSSV <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="mssv"
                    value={formData.mssv}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.mssv = node;
                    }}
                    placeholder="Ví dụ: DH52201699"
                    className={getFieldClassName()}
                  />
                  {errors.mssv && <ErrorMessage message={errors.mssv} />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-content)]">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.fullName = node;
                    }}
                    placeholder="Nhập họ và tên"
                    className={getFieldClassName()}
                  />
                  {errors.fullName && <ErrorMessage message={errors.fullName} />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-content)]">
                    Giới tính <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.gender = node;
                    }}
                    className={getFieldClassName()}
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                  </select>
                  {errors.gender && <ErrorMessage message={errors.gender} />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-content)]">
                    Lớp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="class"
                    value={formData.class}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.class = node;
                    }}
                    placeholder="Ví dụ: D22_TH03"
                    className={getFieldClassName()}
                  />
                  {errors.class && <ErrorMessage message={errors.class} />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-content)]">
                    Khoa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.department = node;
                    }}
                    placeholder="Ví dụ: Công nghệ phần mềm"
                    className={getFieldClassName()}
                  />
                  {errors.department && <ErrorMessage message={errors.department} />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-content)]">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.phone = node;
                    }}
                    placeholder="Ví dụ: 0987654321"
                    className={getFieldClassName()}
                  />
                  {errors.phone && <ErrorMessage message={errors.phone} />}
                </div>
              </div>
            </div>

            {/* Section 2: ID & Address */}
            <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_22px_60px_rgba(79,199,212,0.10)] transition-colors duration-200 hover:bg-[var(--color-primary-soft)] sm:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary-hover)]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary-hover)]">
                      Bước 2
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--color-title)]">Chứng thực</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-content)]">
                    Số CCCD <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cccd"
                    value={formData.cccd}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.cccd = node;
                    }}
                    placeholder="Ví dụ: 021234567890"
                    className={getFieldClassName()}
                  />
                  {errors.cccd && <ErrorMessage message={errors.cccd} />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-content)]">
                    Địa chỉ thường trú <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.address = node;
                    }}
                    placeholder="Nhập địa chỉ thường trú"
                    className={getFieldClassName()}
                  />
                  {errors.address && <ErrorMessage message={errors.address} />}
                </div>
              </div>
            </div>

            {/* Section 3: Emergency Contact */}
            <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_22px_60px_rgba(79,199,212,0.10)] transition-colors duration-200 hover:bg-[var(--color-primary-soft)] sm:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary-hover)]">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary-hover)]">
                      Bước 3
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--color-title)]">Người thân</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-content)]">
                    Tên người thân <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="relationName"
                    value={formData.relationName}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.relationName = node;
                    }}
                    placeholder="Nhập tên người thân"
                    className={getFieldClassName()}
                  />
                  {errors.relationName && <ErrorMessage message={errors.relationName} />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-content)]">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="relationPhone"
                    value={formData.relationPhone}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.relationPhone = node;
                    }}
                    placeholder="Ví dụ: 0987654321"
                    className={getFieldClassName()}
                  />
                  {errors.relationPhone && <ErrorMessage message={errors.relationPhone} />}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[var(--color-content)]">
                    Quan hệ <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleInputChange}
                    ref={(node) => {
                      fieldRefs.current.relationship = node;
                    }}
                    className={getFieldClassName()}
                  >
                    <option value="">Chọn quan hệ</option>
                    <option value="parent">Cha/Mẹ</option>
                    <option value="sibling">Anh/Chị/Em</option>
                    <option value="grandparent">Ông/Bà</option>
                    <option value="other">Khác</option>
                  </select>
                  {errors.relationship && <ErrorMessage message={errors.relationship} />}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-6">
              <button
                type="button"
                onClick={handleClearForm}
                className="rounded-2xl border border-[var(--color-border)] bg-white px-6 py-2.5 text-sm font-semibold text-[var(--color-content)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-hover)] active:scale-[0.98]"
              >
                Xóa
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-[linear-gradient(135deg,#58CAD8_0%,#32B4C2_100%)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(79,199,212,0.22)] transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
              >
                Gửi đăng ký
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
