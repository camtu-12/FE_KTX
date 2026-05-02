import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendOtp, resetPasswordOtp } from "../services/auth.api";
import { LoaderCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"send" | "reset">("send");
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSendOtp = async () => {
    if (!email) {
      alert("Vui lòng nhập email");
      return;
    }

    try {
      setIsSending(true);

      const res = await sendOtp({ email });
      alert(res.message);

      setStep("reset");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleReset = async () => {
    if (!otp || !password) {
      alert("Vui lòng nhập đầy đủ OTP và mật khẩu");
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
    } catch (err: any) {
      alert(err.message);
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
              onChange={(e) => setEmail(e.target.value)}
            />

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
              onChange={(e) => setOtp(e.target.value)}
            />

            <label className="text-sm font-semibold text-gray-600 mt-3 block">
              Mật khẩu mới
            </label>

            <input
              type="password"
              placeholder="Nhập mật khẩu mới"
              className="w-full mt-2 p-3 border border-gray-200 rounded-xl 
            focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

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