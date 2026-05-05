import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiHttpError, sendOtp, resetPasswordOtp } from "../services/auth.api";
import { LoaderCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"send" | "reset">("send");
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const handleSendOtp = async () => {
    setEmailError("");
    setGeneralError("");

    if (!email) {
      setEmailError("Vui lòng nhập email.");
      return;
    }

    try {
      setIsSending(true);

      const res = await sendOtp({ email });
      setGeneralError("");
      alert(res.message);

      setStep("reset");
    } catch (error) {
      if (error instanceof ApiHttpError) {
        setEmailError(error.fieldErrors.email ?? "");
        setGeneralError(error.message || "Gửi OTP thất bại.");
      } else {
        setGeneralError(error instanceof Error ? error.message : "Gửi OTP thất bại.");
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleReset = async () => {
    setOtpError("");
    setPasswordError("");
    setGeneralError("");

    if (!otp || !password) {
      if (!otp) setOtpError("Vui lòng nhập mã OTP.");
      if (!password) setPasswordError("Vui lòng nhập mật khẩu mới.");
      return;
    }

    try {
      setIsResetting(true);

      const res = await resetPasswordOtp({
        email,
        otp,
        password,
      });

      alert(res.message);

      navigate("/login");
    } catch (error) {
      if (error instanceof ApiHttpError) {
        setEmailError(error.fieldErrors.email ?? "");
        setOtpError(error.fieldErrors.otp ?? "");
        setPasswordError(
          error.fieldErrors.password ?? error.fieldErrors.password_confirmation ?? ""
        );
        setGeneralError(error.message || "Đổi mật khẩu thất bại.");
      } else {
        setGeneralError(error instanceof Error ? error.message : "Đổi mật khẩu thất bại.");
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eef2f7]">

      {/* CARD */}
      <div className="w-[380px] bg-white p-6 rounded-2xl shadow-lg">

        <h2 className="text-xl font-bold text-[#1f2a44] mb-4 text-center">
          Lấy lại mật khẩu
        </h2>

        {/* STEP 1: EMAIL */}
        {step === "send" && (
          <>
            <label className="text-sm font-semibold text-gray-600">
              Email đã đăng ký
            </label>

            <input
              type="email"
              placeholder="Nhập email"
              className="w-full mt-2 p-3 border border-gray-200 rounded-xl 
            focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
                if (generalError) setGeneralError("");
              }}
            />
            {emailError ? (
              <p className="mt-2 text-sm font-medium text-[#d14343]">{emailError}</p>
            ) : null}

            <button
              onClick={handleSendOtp}
              disabled={!email || isSending}
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-2xl 
  bg-[linear-gradient(135deg,var(--color-primary)_0%,#31b7d4_100%)] 
  px-4 text-[1rem] font-extrabold text-white 
  shadow-[0_14px_28px_rgba(36,76,184,0.22)] 
  transition duration-200 hover:-translate-y-0.5 
  hover:shadow-[0_18px_32px_rgba(36,76,184,0.28)] 
  disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-80"
            >
              {isSending ? (
                <>
                  <LoaderCircle size={20} className="animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <span>Gửi mã OTP</span>
              )}
            </button>
          </>
        )}

        {/* STEP 2: OTP + PASSWORD */}
        {step === "reset" && (
          <>
            <label className="text-sm font-semibold text-gray-600">
              Mã xác minh
            </label>

            <input
              placeholder="Nhập OTP"
              className="w-full mt-2 p-3 border border-gray-200 rounded-xl 
            focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value);
                if (otpError) setOtpError("");
                if (generalError) setGeneralError("");
              }}
            />
            {otpError ? (
              <p className="mt-2 text-sm font-medium text-[#d14343]">{otpError}</p>
            ) : null}

            <label className="text-sm font-semibold text-gray-600 mt-3 block">
              Mật khẩu mới
            </label>

            <input
              type="password"
              placeholder="Nhập mật khẩu mới"
              className="w-full mt-2 p-3 border border-gray-200 rounded-xl 
            focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
                if (generalError) setGeneralError("");
              }}
            />
            {passwordError ? (
              <p className="mt-2 text-sm font-medium text-[#d14343]">{passwordError}</p>
            ) : null}

            <button
              onClick={handleReset}
              disabled={!otp || !password || isResetting}
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-2xl 
  bg-[linear-gradient(135deg,var(--color-primary)_0%,#31b7d4_100%)] 
  px-4 text-[1rem] font-extrabold text-white 
  shadow-[0_14px_28px_rgba(36,76,184,0.22)] 
  transition duration-200 hover:-translate-y-0.5 
  hover:shadow-[0_18px_32px_rgba(36,76,184,0.28)] 
  disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-80"
            >
              {isResetting ? (
                <>
                  <LoaderCircle size={20} className="animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>Đổi mật khẩu</span>
              )}
            </button>
          </>
        )}

        {generalError ? (
          <p className="mt-3 rounded-xl border border-[#f4caca] bg-[#fff3f3] px-4 py-2.5 text-sm font-medium text-[#c53c3c]">
            {generalError}
          </p>
        ) : null}

        {/* BACK LOGIN */}
        <p
          className="mt-4 text-sm text-blue-500 hover:underline cursor-pointer text-center"
          onClick={() => navigate("/login")}
        >
          Quay lại đăng nhập
        </p>

      </div>
    </div>
  );
}