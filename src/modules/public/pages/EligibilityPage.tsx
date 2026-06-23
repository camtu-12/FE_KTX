import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CheckCircle2,
  CreditCard,
  FileClock,
  GraduationCap,
  Home,
  LogIn,
  ShieldCheck,
  UserX,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

const conditionGroups = [
  {
    title: "Điều kiện học tập",
    icon: GraduationCap,
    items: ["Sinh viên chính quy", "Không phải năm cuối"],
  },
  {
    title: "Điều kiện kỷ luật",
    icon: ShieldCheck,
    items: ["Không nằm trong danh sách blacklist", "Không vi phạm nghiêm trọng trong đợt ở cũ"],
  },
  {
    title: "Điều kiện tài chính và hệ thống",
    icon: CreditCard,
    items: ["Không nợ hóa đơn ", "Đợt đăng ký đang mở", "Không có đơn đang xử lý"],
  },
];

const rejectedCases = [
  {
    label: "Đang nợ tiền phòng",
    icon: Home,
  },
  {
    label: "Đang nợ tiền điện",
    icon: Zap,
  },
  {
    label: "Bị đưa vào danh sách cấm đăng ký",
    icon: Ban,
  },
  {
    label: "Đã có hồ sơ đang xử lý",
    icon: FileClock,
  },
  {
    label: "Không thuộc đối tượng được đăng ký",
    icon: UserX,
  },
];

export default function EligibilityPage() {
  return (
    <div className="auth-font relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[20rem] bg-[radial-gradient(circle_at_top_left,rgba(63,110,235,0.18),transparent_32%),radial-gradient(circle_at_86%_10%,rgba(123,229,214,0.14),transparent_18%),linear-gradient(180deg,rgba(244,248,255,0.98)_0%,rgba(235,240,247,0)_100%)]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-6 lg:gap-6 lg:py-7">
        <section className="relative overflow-hidden rounded-[30px] border border-[#163a8d] bg-[linear-gradient(160deg,#091f56_0%,#123b9f_48%,#0d2c75_100%)] px-6 py-6 text-white shadow-[0_22px_54px_rgba(10,24,74,0.22)] sm:px-8 lg:px-9 lg:py-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_88%_24%,rgba(123,229,214,0.16),transparent_16%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(6,16,52,0.20))]" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              

              <h1 className="text-[clamp(1.65rem,3vw,2.55rem)] font-bold leading-[1.22] tracking-normal text-white">
                Điều kiện đăng ký nội trú STU
              </h1>

              <p className="mt-3 max-w-2xl text-[0.96rem] leading-7 text-[#dbe5ff]">
                Sinh viên cần đáp ứng các điều kiện dưới đây trước khi nộp hồ sơ.
              </p>
            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] border border-white/14 bg-white/10 text-white shadow-[0_16px_34px_rgba(8,18,49,0.22)] backdrop-blur-sm md:h-24 md:w-24">
              <ShieldCheck size={48} strokeWidth={1.9} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {conditionGroups.map((group) => {
            const Icon = group.icon;

            return (
              <article
                key={group.title}
                className="group rounded-[26px] border border-[#d9e4f4] bg-white p-5 shadow-[0_12px_26px_rgba(17,40,97,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#c8d8f0] hover:shadow-[0_22px_42px_rgba(17,40,97,0.12)]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#eef3ff_0%,#f7fbff_100%)] text-[var(--color-primary)] shadow-[0_12px_24px_rgba(36,76,184,0.08)] transition-transform duration-300 ease-out group-hover:scale-110">
                  <Icon size={24} strokeWidth={2.1} />
                </div>
                <h3 className="mt-5 text-[1.08rem] font-extrabold text-[var(--color-title)]">
                  {group.title}
                </h3>
                <div className="mt-4 space-y-3">
                  {group.items.map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle2
                        size={17}
                        className="shrink-0 text-[#0d8d83]"
                        strokeWidth={2.3}
                      />
                      <span className="text-[0.94rem] font-semibold leading-6 text-[var(--color-content)]">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-5 shadow-[0_10px_24px_rgba(175,128,32,0.08)] lg:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fef3c7] text-[#b7791f]">
              <AlertTriangle size={19} strokeWidth={2.2} />
            </div>
            <h2 className="auth-display text-[clamp(1.08rem,1.7vw,1.45rem)] font-extrabold text-[#5f4210]">
              Các trường hợp không đủ điều kiện đăng ký
            </h2>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {rejectedCases.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-xl border border-[#fef3c7] border-l-4 border-l-[#d97706] bg-white/68 px-4 py-3 text-sm font-semibold leading-6 text-[#6c4a13] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_20px_rgba(175,128,32,0.10)]"
                >
                  <Icon
                    size={16}
                    className="mt-1 shrink-0 text-[#d97706]"
                    strokeWidth={2.3}
                  />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[28px] border border-[#163a8d] bg-[linear-gradient(165deg,#0a235f_0%,#14388e_48%,#0d2c75_100%)] p-5 text-white shadow-[0_22px_54px_rgba(10,24,74,0.22)] lg:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,229,214,0.16),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(6,16,52,0.20))]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[clamp(1.45rem,2.35vw,2.15rem)] font-bold leading-[1.22] tracking-normal text-white">
                Đã đáp ứng đủ điều kiện?
              </h2>
              <p className="mt-2 max-w-2xl text-[0.95rem] leading-7 text-white/74">
                Đăng ký tài khoản và đăng nhập hệ thống để nộp hồ sơ nội trú.
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
