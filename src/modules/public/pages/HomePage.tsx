import { useEffect, useRef, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BedDouble,
  Building2,
  Clock3,
  FileCheck2,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import ktxBanner from "../../../assets/ktx.png";

type StatCard = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

type FeatureCard = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const stats: StatCard[] = [
  {
    label: "Phòng nội trú",
    value: "320+",
    description:
      "Không gian ở được quản lý tập trung, tối ưu theo từng khu và tầng.",
    icon: Building2,
  },
  {
    label: "Sinh viên phục vụ",
    value: "1800+",
    description:
      "Quy trình đăng ký, xét duyệt và tiếp nhận được số hóa xuyên suốt.",
    icon: Users,
  },
  {
    label: "Hỗ trợ vận hành",
    value: "24/7",
    description:
      "Thông báo, phản hồi và cập nhật được đồng bộ trên một hệ thống.",
    icon: ShieldCheck,
  },
];

const features: FeatureCard[] = [
  {
    title: "Đăng ký nội trú trực tuyến",
    description:
      "Sinh viên nộp hồ sơ và theo dõi tiến độ xét duyệt trên cùng một luồng rõ ràng.",
    icon: FileCheck2,
  },
  {
    title: "Quản lý tập trung, minh bạch",
    description:
      "Ban quản lý kiểm soát phòng ở, cư trú và thông báo với trải nghiệm đồng nhất.",
    icon: BedDouble,
  },
  {
    title: "Đồng hành suốt quá trình học tập",
    description:
      "Mọi tương tác từ đăng ký, lưu trú đến hỗ trợ được tổ chức gọn gàng và hiện đại.",
    icon: GraduationCap,
  },
];

const contacts = [
  {
    icon: MapPin,
    label: "Địa chỉ",
    value: "180 Cao Lỗ, Phường 4, Quận 8, TP. Hồ Chí Minh",
  },
  {
    icon: Phone,
    label: "Hotline",
    value: "(028) 38753588",
  },
  {
    icon: Mail,
    label: "Email",
    value: "hotro.ktx@stu.edu.vn",
  },
  {
    icon: Clock3,
    label: "Giờ hỗ trợ",
    value: "07:00 - 17:00",
  },
];

const surfaceClassName =
  "rounded-[32px] border border-white/80 bg-white/92 shadow-[0_24px_72px_rgba(17,40,97,0.14)] backdrop-blur-xl transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out";

const revealStyle = (delay: number): CSSProperties =>
  ({
    "--reveal-delay": `${delay}ms`,
  }) as CSSProperties;

export default function HomePage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = pageRef.current;
    if (!container) return;

    const nodes = Array.from(
      container.querySelectorAll<HTMLElement>("[data-reveal]")
    );

    if (nodes.length === 0) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={pageRef} className="auth-font relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(63,110,235,0.24),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(123,229,214,0.24),transparent_20%),radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.45),transparent_38%),linear-gradient(180deg,rgba(244,248,255,0.98)_0%,rgba(235,240,247,0)_100%)]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-6 pt-8 lg:gap-10 lg:pt-10">
        <section
          data-reveal
          className={`auth-reveal ${surfaceClassName} overflow-hidden p-4 sm:p-5 lg:p-6`}
        >
          <div className="grid gap-5 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,#091f56_0%,#123b9f_45%,#0a1d56_100%)] px-6 py-7 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_28px_55px_rgba(9,24,74,0.28)] sm:px-8 sm:py-9 lg:px-9 lg:py-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_22%),radial-gradient(circle_at_78%_20%,rgba(123,229,214,0.22),transparent_16%),radial-gradient(circle_at_50%_120%,rgba(61,120,255,0.38),transparent_38%),linear-gradient(180deg,rgba(10,19,54,0.08)_0%,rgba(8,18,49,0.48)_100%)]" />
              <div className="absolute -left-10 top-12 h-52 w-52 rounded-full border border-white/12" />
              <div className="absolute -right-10 top-[-2rem] h-36 w-36 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-[-4rem] right-[-1rem] h-40 w-40 rounded-full bg-[#7be5d6]/16 blur-3xl" />

              <div className="relative z-10 max-w-[31rem]">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#7be5d6] px-5 py-2 text-[0.74rem] font-extrabold uppercase tracking-[0.14em] text-[#0d5d66] shadow-[0_16px_34px_rgba(123,229,214,0.24)] ring-1 ring-white/24">
                  <Sparkles size={15} />
                  Nền tảng quản lý nội trú STU
                </div>

                <h1 className="auth-display mt-4 max-w-[28rem] text-[clamp(1.82rem,3.35vw,3rem)] font-extrabold leading-[1.22] tracking-[-0.04em] text-white">
                  Ký túc xá số hóa, vận hành đồng nhất và tinh gọn hơn.
                </h1>

                <p className="mt-3 max-w-[25rem] text-[0.98rem] leading-7 text-[#dbe5ff]">
                  Kết nối đăng ký, xét duyệt và vận hành nội trú trên một nền
                  tảng thống nhất, giúp sinh viên và ban quản lý theo dõi mọi
                  tương tác nhanh hơn, rõ hơn và đáng tin cậy hơn.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    to="/register"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#244cb8_0%,#2d58c4_58%,#31b7d4_100%)] px-6 text-base font-extrabold text-white shadow-[0_18px_38px_rgba(36,76,184,0.30)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:brightness-110 hover:shadow-[0_24px_46px_rgba(36,76,184,0.34)]"
                  >
                    Đăng ký nội trú
                    <ArrowRight size={18} />
                  </Link>

                  <Link
                    to="/login"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/12 px-6 text-base font-bold text-white backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-white/35 hover:bg-white/18 hover:shadow-[0_18px_34px_rgba(10,24,74,0.34)]"
                  >
                    Truy cập hệ thống
                  </Link>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {stats.map((item) => (
                    <div
                      key={item.label}
                      data-reveal
                      style={revealStyle(220)}
                      className="rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.15)_0%,rgba(255,255,255,0.08)_100%)] px-4 py-4 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.20)_0%,rgba(255,255,255,0.11)_100%)] hover:shadow-[0_20px_40px_rgba(8,18,49,0.34)]"
                    >
                      <div className="text-[1.65rem] font-extrabold text-white">
                        {item.value}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white/82">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-[28px] border border-[#dbe4f4] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-3 shadow-[0_24px_60px_rgba(17,40,97,0.12)] transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-[0_34px_78px_rgba(17,40,97,0.18)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,229,214,0.22),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(95,140,255,0.16),transparent_26%)] opacity-90" />
              <div className="relative overflow-hidden rounded-[24px]">
                <img
                  src={ktxBanner}
                  alt="Khuôn viên ký túc xá STU"
                  className="h-[320px] w-full rounded-[24px] object-cover saturate-[1.06] transition-transform duration-700 ease-out group-hover:scale-[1.045] sm:h-[360px] lg:h-[100%]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,23,67,0.02)_0%,rgba(9,23,67,0.60)_100%)]" />

                <div className="absolute bottom-5 left-5 right-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-white/24 bg-white/14 px-3 py-2.5 text-white shadow-[0_18px_36px_rgba(9,23,67,0.18)] backdrop-blur-md transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:bg-white/18">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/14">
                        <FileCheck2 size={17} />
                      </div>
                      <div>
                        <div className="text-[0.78rem] font-semibold text-white/78">
                          Quy trình số hóa
                        </div>
                        <div className="mt-0.5 text-[0.96rem] font-extrabold">
                          Đăng ký minh bạch
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-white/24 bg-white/14 px-3 py-2.5 text-white shadow-[0_18px_36px_rgba(9,23,67,0.18)] backdrop-blur-md transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:bg-white/18">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/14">
                        <Clock3 size={17} />
                      </div>
                      <div>
                        <div className="text-[0.78rem] font-semibold text-white/78">
                          Đồng hành liên tục
                        </div>
                        <div className="mt-0.5 text-[0.96rem] font-extrabold">
                          Hỗ trợ 24/7
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          data-reveal
          className="auth-reveal grid gap-6 md:grid-cols-3"
          style={revealStyle(120)}
        >
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                data-reveal
                style={revealStyle(220)}
                className={`${surfaceClassName} group p-6 hover:-translate-y-1.5 hover:border-[#cddbf3] hover:bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] hover:shadow-[0_30px_58px_rgba(17,40,97,0.18)]`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#eef3ff_0%,#f7fbff_100%)] text-[var(--color-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_24px_rgba(36,76,184,0.08)] transition-transform duration-300 ease-out group-hover:scale-110 group-hover:shadow-[0_18px_28px_rgba(36,76,184,0.16)]">
                  <Icon size={24} strokeWidth={2.1} />
                </div>
                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-[#6c7b9c]">
                  {item.label}
                </p>
                <p className="mt-2 auth-display text-[2.9rem] font-extrabold tracking-[-0.045em] text-[var(--color-primary-hover)]">
                  {item.value}
                </p>
                <p className="mt-4 text-[0.98rem] leading-7 text-[var(--color-content)]">
                  {item.description}
                </p>
              </article>
            );
          })}
        </section>

        <section
          data-reveal
          className="auth-reveal grid gap-6 lg:grid-cols-[1.04fr_0.96fr]"
          style={revealStyle(180)}
        >
          <article className={`${surfaceClassName} relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_58%,#f2f7ff_100%)] p-8 hover:shadow-[0_32px_64px_rgba(17,40,97,0.16)] lg:p-10`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,229,214,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(94,140,255,0.14),transparent_28%)]" />
            <div className="absolute right-[-2rem] top-[-2rem] h-32 w-32 rounded-full bg-[rgba(49,183,212,0.14)] blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center rounded-full border border-[#dce7fb] bg-white/92 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-primary-hover)] shadow-[0_10px_24px_rgba(17,40,97,0.06)]">
                Giới thiệu ký túc xá
              </div>
              <h2 className="auth-display mt-5 max-w-[32rem] text-[clamp(1.95rem,3.1vw,3rem)] font-extrabold leading-[1.22] tracking-[-0.045em] text-[var(--color-title)]">
                Trải nghiệm nội trú đồng nhất, chỉn chu và đáng tin cậy hơn.
              </h2>
              <p className="mt-5 max-w-[40rem] text-[0.98rem] leading-8 text-[var(--color-content)]">
                Ký túc xá STU được vận hành theo hướng hiện đại với hệ thống quản
                lý tập trung, tối ưu quy trình đăng ký nội trú, quản lý phòng ở
                và hỗ trợ sinh viên xuyên suốt quá trình học tập. Mọi thông tin
                từ đăng ký, xét duyệt đến cập nhật thông báo đều được thực hiện
                trên một nền tảng thống nhất.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {features.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      data-reveal
                      style={revealStyle(240)}
                      className="group rounded-[26px] border border-[#d9e4f4] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(243,248,255,0.96)_100%)] p-5 shadow-[0_12px_26px_rgba(17,40,97,0.06)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[#c8d8f0] hover:bg-[linear-gradient(180deg,#ffffff_0%,#edf5ff_100%)] hover:shadow-[0_28px_54px_rgba(17,40,97,0.16)]"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#eef3ff_0%,#f5f9ff_100%)] text-[var(--color-primary)] shadow-[0_10px_20px_rgba(36,76,184,0.08)] transition-transform duration-300 ease-out group-hover:scale-110">
                        <Icon size={21} strokeWidth={2.1} />
                      </div>
                      <h3 className="mt-4 text-[1.02rem] font-extrabold text-[var(--color-title)]">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-[var(--color-content)]">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-[32px] border border-[#163a8d] bg-[linear-gradient(165deg,#0a235f_0%,#14388e_48%,#0d2c75_100%)] p-8 text-white shadow-[0_28px_64px_rgba(10,24,74,0.24)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_34px_76px_rgba(10,24,74,0.30)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,229,214,0.18),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(94,140,255,0.20),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(6,16,52,0.20))]" />
            <div className="absolute -right-10 top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(8,18,49,0.18)] backdrop-blur-sm">
                <Building2 size={15} />
                Hệ sinh thái nội trú
              </div>

              <div className="mt-5 max-w-[26rem]">
                <h3 className="auth-display text-[2rem] font-extrabold tracking-[-0.045em] text-white">
                  Ba trụ cột cho một hệ nội trú hiện đại.
                </h3>
                <p className="mt-3 text-[0.98rem] leading-7 text-white/72">
                  Mỗi lớp tính năng được tổ chức như một hệ vận hành liền mạch,
                  rõ ràng và nhất quán cho cả sinh viên lẫn ban quản lý.
                </p>
              </div>

              <div className="mt-7 space-y-4">
                <div
                  data-reveal
                  style={revealStyle(240)}
                  className="rounded-[24px] border border-white/12 bg-white/10 p-5 shadow-[0_18px_36px_rgba(8,18,49,0.20)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-1.5 hover:bg-white/14 hover:shadow-[0_26px_48px_rgba(8,18,49,0.24)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#244cb8_0%,#31b7d4_100%)] text-white shadow-[0_14px_28px_rgba(36,76,184,0.24)]">
                      <BedDouble size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white/66">
                        Vận hành lưu trú
                      </div>
                      <div className="mt-1 text-lg font-extrabold text-white">
                        Quản lý tập trung theo phòng
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  data-reveal
                  style={revealStyle(360)}
                  className="rounded-[24px] border border-white/12 bg-white/10 p-5 shadow-[0_18px_36px_rgba(8,18,49,0.20)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-1.5 hover:bg-white/14 hover:shadow-[0_26px_48px_rgba(8,18,49,0.24)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#12377e_0%,#2a55c6_100%)] text-white shadow-[0_14px_28px_rgba(18,55,126,0.24)]">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white/66">
                        Bảo mật và minh bạch
                      </div>
                      <div className="mt-1 text-lg font-extrabold text-white">
                        Dữ liệu thống nhất, theo dõi dễ dàng
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  data-reveal
                  style={revealStyle(480)}
                  className="rounded-[24px] border border-white/12 bg-white/10 p-5 shadow-[0_18px_36px_rgba(8,18,49,0.20)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-1.5 hover:bg-white/14 hover:shadow-[0_26px_48px_rgba(8,18,49,0.24)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0d5d66_0%,#31b7d4_100%)] text-white shadow-[0_14px_28px_rgba(15,111,123,0.24)]">
                      <Users size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white/66">
                        Trải nghiệm sinh viên
                      </div>
                      <div className="mt-1 text-lg font-extrabold text-white">
                        Hỗ trợ nhanh, giao diện nhất quán
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>

      <footer
        data-reveal
        style={revealStyle(220)}
        className="auth-reveal relative left-1/2 mt-4 w-screen -translate-x-1/2 overflow-hidden bg-[linear-gradient(145deg,#0a215c_0%,#14388e_48%,#0d2b74_100%)] text-white shadow-[0_-24px_60px_rgba(10,24,74,0.22)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_82%_24%,rgba(123,229,214,0.18),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(6,16,52,0.22))]" />

        <div className="relative mx-auto grid max-w-7xl gap-4 px-6 py-5 lg:grid-cols-[0.88fr_0.84fr_1fr] lg:px-8 lg:py-6">
          <div>
            <div className="mt-1 flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#244cb8_0%,#31b7d4_100%)] shadow-[0_12px_24px_rgba(8,20,64,0.22)]">
                <div className="flex h-7.5 w-7.5 items-center justify-center rounded-[12px] bg-white/14 backdrop-blur-sm">
                  <Building2 size={18} className="text-white" strokeWidth={2.3} />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ffffff_0%,#dff8fb_100%)] text-[#1b8d96] shadow-lg ring-2 ring-white/30">
                  <BedDouble size={10} strokeWidth={2.2} />
                </div>
              </div>

              <div>
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white/60">
                  STU Dormitory
                </div>
                <div className="auth-display mt-1 text-[1.35rem] font-extrabold leading-none tracking-[-0.05em] text-white">
                  Nội trú hiện đại
                </div>
              </div>
            </div>
          </div>

          <div className="lg:-translate-x-5">
            <h3 className="text-base font-bold uppercase tracking-[0.14em] text-white/84">
              Liên hệ
            </h3>
            <div className="mt-3 space-y-2.5">
              {contacts.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-[16px] px-3 py-2.5 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-white/12 hover:shadow-[0_18px_34px_rgba(8,18,49,0.24)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[14px] bg-white/10 text-white">
                        <Icon size={15} />
                      </div>
                      <div>
                        <div className="text-[0.82rem] font-semibold text-white/65">
                          {item.label}
                        </div>
                        <div
                          className={[
                            "mt-0.5 text-[0.88rem] leading-6 text-white/88",
                            item.label === "Địa chỉ" ? "whitespace-nowrap" : "",
                          ].join(" ")}
                        >
                          {item.value}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:translate-x-9">
            <div className="p-3 backdrop-blur-sm">
              <div className="overflow-hidden rounded-[20px] border border-white/12 shadow-[0_18px_34px_rgba(8,18,49,0.24)] lg:w-[450px]">
                <iframe
                  title="Bản đồ KTX Trường Đại học Công nghệ Sài Gòn"
                  src="https://www.google.com/maps?q=KTX%20Truong%20Dai%20hoc%20Cong%20nghe%20Sai%20Gon&z=17&output=embed"
                  className="h-[220px] w-full lg:h-[260px]"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/12">
          <div className="mx-auto flex max-w-7xl justify-center px-6 py-2.5 text-center text-[0.78rem] text-white/64 lg:px-8">
            <p>© 2026 STU Dormitory. Powered by STU.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
