import {
  ArrowRight,
  BedDouble,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  DoorOpen,
  FileText,
  LogIn,
} from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    title: "Đăng ký hồ sơ",
    icon: FileText,
    description:
      "Sinh viên đăng nhập hệ thống, điền đầy đủ thông tin cá nhân và tải lên các giấy tờ yêu cầu trong thời gian đợt đăng ký đang mở.",
    details: [
      "Điền thông tin cá nhân chính xác",
      "Tải ảnh CCCD mặt trước và sau",
      "Tải ảnh chân dung rõ nét",
      "Bổ sung minh chứng ưu tiên nếu có",
    ],
  },
  {
    title: "Xét duyệt hồ sơ",
    icon: ClipboardCheck,
    description:
      "Ban quản lý ký túc xá kiểm tra điều kiện, tính hợp lệ của hồ sơ và xếp thứ tự ưu tiên theo quy định.",
    details: [
      "Kiểm tra điều kiện đăng ký",
      "Xác minh tính hợp lệ của giấy tờ",
      "Xếp hạng ưu tiên theo đối tượng",
      "Thông báo kết quả qua tài khoản sinh viên",
    ],
  },
  {
    title: "Phân phòng",
    icon: Building2,
    description:
      "Sau khi hồ sơ được duyệt, hệ thống tự động sắp xếp phòng phù hợp theo giới tính, khu và tầng theo quy định.",
    details: [
      "Phân theo giới tính",
      "Ưu tiên theo đối tượng chính sách",
      "Thông báo phòng được phân qua hệ thống",
    ],
  },
  {
    title: "Chọn giường",
    icon: BedDouble,
    description:
      "Sinh viên được phân phòng sẽ đăng nhập vào hệ thống để chọn giường trống phù hợp trong phòng đã được chỉ định.",
    details: [
      "Chọn trong thời gian quy định",
      "Xem sơ đồ giường trong phòng",
      "Xác nhận lựa chọn trước khi thanh toán",
    ],
  },
  {
    title: "Thanh toán",
    icon: CreditCard,
    description:
      "Sinh viên thanh toán phí nội trú theo hóa đơn được phát hành sau khi xác nhận giường. Thanh toán đúng hạn để hoàn tất thủ tục.",
    details: [
      "Xem hóa đơn chi tiết trên hệ thống",
      "Thanh toán trực tuyến hoặc tại quầy",
      "Lưu biên lai để đối chiếu khi cần",
    ],
  },
  {
    title: "Nhận phòng",
    icon: DoorOpen,
    description:
      "Sau khi hoàn tất thanh toán, sinh viên nhận thông tin phòng và giường chính thức, thực hiện thủ tục nhận phòng theo hướng dẫn.",
    details: [
      "Nhận thông tin phòng qua hệ thống",
      "Mang theo CCCD và biên lai thanh toán",
      "Ký biên bản bàn giao tài sản phòng",
    ],
  },
];

export default function RegistrationProcessPage() {
  return (
    <div className="auth-font relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[20rem] bg-[radial-gradient(circle_at_top_left,rgba(63,110,235,0.18),transparent_32%),radial-gradient(circle_at_86%_10%,rgba(123,229,214,0.14),transparent_18%),linear-gradient(180deg,rgba(244,248,255,0.98)_0%,rgba(235,240,247,0)_100%)]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-6 lg:gap-6 lg:py-7">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[30px] border border-[#163a8d] bg-[linear-gradient(160deg,#091f56_0%,#123b9f_48%,#0d2c75_100%)] px-6 py-6 text-white shadow-[0_22px_54px_rgba(10,24,74,0.22)] sm:px-8 lg:px-9 lg:py-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_88%_24%,rgba(123,229,214,0.16),transparent_16%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(6,16,52,0.20))]" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-[clamp(1.65rem,3vw,2.55rem)] font-bold leading-[1.22] text-white">
                Quy trình xét duyệt nội trú STU
              </h1>
              <p className="mt-3 max-w-2xl text-[0.96rem] leading-7 text-[#dbe5ff]">
                Từ lúc nộp hồ sơ đến khi nhận phòng, toàn bộ quy trình được
                thực hiện trực tuyến và cập nhật minh bạch trên hệ thống.
              </p>
            </div>
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] border border-white/14 bg-white/10 text-white shadow-[0_16px_34px_rgba(8,18,49,0.22)] backdrop-blur-sm md:h-24 md:w-24">
              <ClipboardCheck size={48} strokeWidth={1.9} />
            </div>
          </div>
        </section>

        {/* Steps */}
        <div className="grid gap-4 lg:grid-cols-2">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <article
                key={step.title}
                className="group rounded-[26px] border border-[#d9e4f4] bg-white p-5 shadow-[0_12px_26px_rgba(17,40,97,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#c8d8f0] hover:shadow-[0_22px_42px_rgba(17,40,97,0.12)] lg:p-6"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#eef3ff_0%,#f7fbff_100%)] text-[var(--color-primary)] shadow-[0_10px_20px_rgba(36,76,184,0.08)] transition-transform duration-300 ease-out group-hover:scale-110">
                    <Icon size={22} strokeWidth={2.1} />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#8fa3ca]">
                      Bước {String(index + 1).padStart(2, "0")}
                    </div>
                    <h3 className="mt-0.5 text-[1.06rem] font-extrabold text-[var(--color-title)]">
                      {step.title}
                    </h3>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-7 text-[var(--color-content)]">
                  {step.description}
                </p>

                <div className="mt-4 space-y-2.5">
                  {step.details.map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <CheckCircle2
                        size={15}
                        className="shrink-0 text-[#0d8d83]"
                        strokeWidth={2.3}
                      />
                      <span className="text-sm font-semibold text-[var(--color-content)]">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        {/* CTA */}
        <section className="relative overflow-hidden rounded-[28px] border border-[#163a8d] bg-[linear-gradient(165deg,#0a235f_0%,#14388e_48%,#0d2c75_100%)] p-5 text-white shadow-[0_22px_54px_rgba(10,24,74,0.22)] lg:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,229,214,0.16),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(6,16,52,0.20))]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[clamp(1.45rem,2.35vw,2.15rem)] font-bold leading-[1.22] text-white">
                Sẵn sàng đăng ký?
              </h2>
              <p className="mt-2 max-w-2xl text-[0.95rem] leading-7 text-white/74">
                Đăng nhập hệ thống để nộp hồ sơ nội trú ngay khi đợt đăng ký
                đang mở.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#244cb8_0%,#2d58c4_58%,#31b7d4_100%)] px-5 text-sm font-extrabold text-white shadow-[0_18px_38px_rgba(36,76,184,0.30)] transition-all duration-300 ease-out hover:-translate-y-1 hover:brightness-110"
              >
                Đăng ký tài khoản
                <ArrowRight size={17} />
              </Link>
              <Link
                to="/login"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/12 px-5 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/35 hover:bg-white/18"
              >
                <LogIn size={17} />
                Đăng nhập hệ thống
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
