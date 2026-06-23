import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  BadgeCheck,
  BedDouble,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Camera,
  Car,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  FileText,
  Flame,
  Home,
  Mail,
  MapPin,
  Phone,
  Users,
  Utensils,
} from "lucide-react";
import { Link } from "react-router-dom";
import heroBanner from "../../../assets/tuade.png";
import {
  getRegistrationPeriods,
  type RegistrationPeriodData,
} from "../../../api/registrationApi";
import RegistrationStatusCard from "./RegistrationStatusCard";

type InfoCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  detailPath?: string;
};

type Announcement = {
  title: string;
  date: string;
  category: string;
  description: string;
  icon: LucideIcon;
};


type ContactItem = {
  icon: LucideIcon;
  label: string;
  value: string;
};

const announcements: Announcement[] = [
  {
    title: "Mở đợt đăng ký nội trú học kỳ mới",
    date: "22/06/2026",
    category: "Đăng ký nội trú",
    description:
      "Sinh viên STU có nhu cầu lưu trú có thể nộp hồ sơ trực tuyến và theo dõi trạng thái xét duyệt.",
    icon: CalendarDays,
  },
  {
    title: "Gia hạn lưu trú dành cho sinh viên đang ở KTX",
    date: "18/06/2026",
    category: "Gia hạn lưu trú",
    description:
      "Sinh viên đủ điều kiện thực hiện gia hạn trên hệ thống trước khi kết thúc kỳ lưu trú hiện tại.",
    icon: FileCheck2,
  },
  {
    title: "Cập nhật quy định sử dụng khu sinh hoạt chung",
    date: "15/06/2026",
    category: "Quy định mới",
    description:
      "Ban quản lý bổ sung hướng dẫn về giờ sinh hoạt, vệ sinh chung và trách nhiệm bảo quản tài sản.",
    icon: AlertCircle,
  },
  {
    title: "Nhắc lịch thanh toán phí nội trú",
    date: "10/06/2026",
    category: "Thanh toán",
    description:
      "Sinh viên kiểm tra hóa đơn phòng ở, điện nước và hoàn tất thanh toán theo thời hạn được thông báo.",
    icon: CreditCard,
  },
  {
    title: "Thông báo kiểm tra an toàn PCCC định kỳ",
    date: "05/06/2026",
    category: "An toàn",
    description:
      "KTX tổ chức rà soát thiết bị PCCC, lối thoát hiểm và hệ thống camera tại các khu vực lưu trú.",
    icon: Flame,
  },
];

const registrationGuides: InfoCard[] = [
  {
    title: "Điều kiện đăng ký",
    description:
      "Sinh viên STU đang theo học, có nhu cầu lưu trú và đáp ứng quy định xét duyệt của ký túc xá.",
    icon: BadgeCheck,
    detailPath: "/dieu-kien-noi-tru",
  },
  {
    title: "Hồ sơ cần chuẩn bị",
    description:
      "Thông tin cá nhân, minh chứng ưu tiên nếu có và các giấy tờ cần thiết theo yêu cầu từng đợt.",
    icon: FileText,
    detailPath: "/ho-so-can-chuan-bi",
  },
  {
    title: "Quy trình xét duyệt",
    description:
      "Hồ sơ được kiểm tra, xếp thứ tự ưu tiên và cập nhật kết quả trực tiếp trên tài khoản sinh viên.",
    icon: ClipboardCheck,
    detailPath: "/quy-trinh-xet-duyet",
  },
  {
    title: "Hướng dẫn thanh toán",
    description:
      "Sinh viên thanh toán phí nội trú theo hóa đơn được phát hành sau khi được phân phòng hoặc chọn giường.",
    icon: CreditCard,
  },
];


const facilities: InfoCard[] = [
  {
    title: "Phòng ở",
    description: "Không gian lưu trú được quản lý theo phòng, tầng và khu.",
    icon: Home,
  },
  {
    title: "Căn tin",
    description: "Hỗ trợ bữa ăn và nhu cầu sinh hoạt hằng ngày.",
    icon: Utensils,
  },
  {
    title: "Bãi xe",
    description: "Khu vực gửi xe thuận tiện cho sinh viên nội trú.",
    icon: Car,
  },
  {
    title: "Khu tự học",
    description: "Không gian yên tĩnh phục vụ học tập và làm việc nhóm.",
    icon: BookOpen,
  },
  {
    title: "Khu sinh hoạt",
    description: "Khu vực sinh hoạt chung dành cho các hoạt động tập thể.",
    icon: Users,
  },
  {
    title: "Camera an ninh",
    description: "Theo dõi khu vực chung, hỗ trợ đảm bảo an toàn lưu trú.",
    icon: Camera,
  },
  {
    title: "PCCC",
    description: "Trang bị thiết bị và quy trình kiểm tra an toàn định kỳ.",
    icon: Flame,
  },
];

const contacts: ContactItem[] = [
  {
    icon: MapPin,
    label: "Địa chỉ",
    value: "KTX Trường Đại học Công nghệ Sài Gòn",
  },
  {
    icon: Phone,
    label: "Điện thoại",
    value: "028 xxxx xxxx",
  },
  {
    icon: Mail,
    label: "Email",
    value: "ktx@stu.edu.vn",
  },
];

const footerContacts: ContactItem[] = [
  ...contacts,
  {
    icon: CalendarDays,
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


function SectionHeading({
  eyebrow,
  icon: Icon,
  iconColor,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  icon?: LucideIcon;
  iconColor?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 border-b-2 border-[var(--color-primary)] pb-2">
        {eyebrow ? (
          <span className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-primary-hover)]">
            {eyebrow}
          </span>
        ) : null}
        {Icon ? (
          <Icon size={18} className="shrink-0" strokeWidth={2.2} style={{ color: iconColor ?? "var(--color-primary)" }} />
        ) : null}
        <h2 className="text-[1.05rem] font-extrabold uppercase tracking-[0.08em] text-[var(--color-title)]">
          {title}
        </h2>
        <div className="flex-1" />
        {action}
      </div>
      {description ? (
        <p className="mt-3 max-w-3xl text-[0.98rem] leading-7 text-[var(--color-content)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [activePeriod, setActivePeriod] = useState<RegistrationPeriodData | null>(null);

  useEffect(() => {
    getRegistrationPeriods()
      .then((periods) => {
        const found =
          periods.find((p) => p.status === "active") ??
          periods.find((p) => p.status === "pending") ??
          periods[0] ??
          null;
        setActivePeriod(found);
      })
      .catch(() => {});
  }, []);

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
      { threshold: 0.05 }
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);


  return (
    <div ref={pageRef} className="auth-font relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(63,110,235,0.24),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(123,229,214,0.20),transparent_20%),linear-gradient(180deg,rgba(244,248,255,0.98)_0%,rgba(235,240,247,0)_100%)]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-8 pt-8 lg:gap-10 lg:pt-10">
        <section
          className={`${surfaceClassName} overflow-hidden p-4 sm:p-5 lg:p-6`}
        >
          <div className="relative overflow-hidden rounded-[28px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_28px_55px_rgba(9,24,74,0.28)]" style={{ height: "480px" }}>
            <img
              src={heroBanner}
              alt=""
              aria-hidden
              style={{ objectPosition: "center center" }}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_40%,rgba(9,23,67,0.65)_100%)]" />

          </div>
        </section>
        <section
          data-reveal
          className="auth-reveal is-visible"
          style={revealStyle(80)}
        >
          <div>
            <SectionHeading icon={CalendarDays} iconColor="#16a34a" title="Trạng thái đăng ký ký túc xá" />
            <div className="mt-4">
              <RegistrationStatusCard period={activePeriod} />
            </div>
          </div>
        </section>

        <section
          data-reveal
          className="auth-reveal is-visible"
          style={revealStyle(160)}
        >
          <article className={`${surfaceClassName} relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_58%,#f2f7ff_100%)] p-8 hover:shadow-[0_32px_64px_rgba(17,40,97,0.16)] lg:p-10`}>
            <SectionHeading
              icon={ClipboardCheck}
              iconColor="#2563eb"
              title="Những điều cần biết trước khi đăng ký"
            />

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {registrationGuides.map((item, index) => {
                const Icon = item.icon;
                const cardClass = "group rounded-[26px] border border-[#d9e4f4] bg-white/90 p-5 shadow-[0_12px_26px_rgba(17,40,97,0.06)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[#c8d8f0] hover:bg-[linear-gradient(180deg,#ffffff_0%,#edf5ff_100%)] hover:shadow-[0_28px_54px_rgba(17,40,97,0.16)]";
                const content = (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#eef3ff_0%,#f5f9ff_100%)] text-(--color-primary) shadow-[0_10px_20px_rgba(36,76,184,0.08)] transition-transform duration-300 ease-out group-hover:scale-110">
                      <Icon size={21} strokeWidth={2.1} />
                    </div>
                    <h3 className="mt-4 text-[1.02rem] font-extrabold text-(--color-title)">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-(--color-content)">
                      {item.description}
                    </p>
                  </>
                );

                return item.detailPath ? (
                  <Link key={item.title} to={item.detailPath} data-reveal style={revealStyle(220 + index * 80)} className={cardClass}>
                    {content}
                  </Link>
                ) : (
                  <div key={item.title} data-reveal style={revealStyle(220 + index * 80)} className={cardClass}>
                    {content}
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section
          id="thong-bao"
          data-reveal
          className={`auth-reveal is-visible ${surfaceClassName} p-6 lg:p-8`}
          style={revealStyle(120)}
        >
          <SectionHeading
            icon={Bell}
            iconColor="#d97706"
            title="Thông báo"
          />

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {announcements.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  data-reveal
                  style={revealStyle(180 + index * 70)}
                  className="group rounded-[26px] border border-[#d9e4f4] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,249,255,0.96)_100%)] p-5 shadow-[0_12px_26px_rgba(17,40,97,0.06)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[#c8d8f0] hover:shadow-[0_24px_48px_rgba(17,40,97,0.14)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#eef3ff_0%,#f7fbff_100%)] text-[var(--color-primary)] shadow-[0_10px_20px_rgba(36,76,184,0.08)] transition-transform duration-300 ease-out group-hover:scale-110">
                      <Icon size={21} strokeWidth={2.1} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#6c7b9c]">
                        <span>{item.category}</span>
                        <span className="h-1 w-1 rounded-full bg-[#a9b8d3]" />
                        <span>{item.date}</span>
                      </div>
                      <h3 className="mt-2 text-[1.05rem] font-extrabold leading-6 text-[var(--color-title)]">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-[var(--color-content)]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>


        <section
          data-reveal
          className={`auth-reveal is-visible ${surfaceClassName} p-6 lg:p-8`}
          style={revealStyle(200)}
        >
          <SectionHeading
            icon={Building2}
            iconColor="#0d8d83"
            title="Cơ sở vật chất"
          />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {facilities.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  data-reveal
                  style={revealStyle(220 + index * 55)}
                  className="group rounded-[24px] border border-[#d9e4f4] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-5 shadow-[0_12px_26px_rgba(17,40,97,0.06)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[#c8d8f0] hover:shadow-[0_24px_48px_rgba(17,40,97,0.14)]"
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
                </article>
              );
            })}
          </div>
        </section>

      </div>

      <footer
        data-reveal
        style={revealStyle(220)}
        className="auth-reveal is-visible relative left-1/2 mt-4 w-screen -translate-x-1/2 overflow-hidden bg-[linear-gradient(145deg,#0a215c_0%,#14388e_48%,#0d2b74_100%)] text-white shadow-[0_-24px_60px_rgba(10,24,74,0.22)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_82%_24%,rgba(123,229,214,0.18),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(6,16,52,0.22))]" />

        <div className="relative mx-auto grid max-w-7xl gap-4 px-6 py-5 lg:grid-cols-[0.88fr_0.84fr_1fr] lg:px-8 lg:py-6">
          <div>
            <div className="mt-1 flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#244cb8_0%,#31b7d4_100%)] shadow-[0_12px_24px_rgba(8,20,64,0.22)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-white/14 backdrop-blur-sm">
                  <Building2 size={18} className="text-white" strokeWidth={2.3} />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ffffff_0%,#dff8fb_100%)] text-[#1b8d96] shadow-lg ring-2 ring-white/30">
                  <BedDouble size={10} strokeWidth={2.2} />
                </div>
              </div>

              <div>
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white/60">
                  STU Dormitory
                </div>
                <div className="auth-display mt-1 text-[1.35rem] font-extrabold leading-none text-white">
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
              {footerContacts.map((item) => {
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
                        <div className="mt-0.5 text-[0.88rem] leading-6 text-white/88">
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
            <p>© 2026 STU Dormitory. Powered by Tú & Phát.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
