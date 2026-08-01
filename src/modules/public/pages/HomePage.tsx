import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  BookOpen,
  Building2,
  CalendarDays,
  Camera,
  Car,
  ClipboardCheck,
  CreditCard,
  Droplets,
  FileText,
  Flame,
  Home,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
  Utensils,
  X,
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

type ContactItem = {
  icon: LucideIcon;
  label: string;
  value: string;
};

type IntroTabKey = "overview" | "facilities" | "eligibility" | "rules" | "contact";

type IntroTab = {
  id: IntroTabKey;
  label: string;
  title: string;
  body: string[];
};

type IntroStat = {
  icon: LucideIcon;
  value: string;
  label: string;
};

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

const introTabs: IntroTab[] = [
  {
    id: "overview",
    label: "Giới thiệu",
    title: "Môi trường lưu trú dành cho sinh viên STU",
    body: [
      "Ký túc xá STU hỗ trợ sinh viên có nhu cầu lưu trú trong quá trình học tập tại trường.",
      "Hệ thống trực tuyến giúp sinh viên đăng ký nội trú, theo dõi xét duyệt, chọn giường và quản lý các thông tin lưu trú quan trọng.",
    ],
  },
  {
    id: "facilities",
    label: "Cơ sở vật chất",
    title: "Không gian sinh hoạt thiết yếu",
    body: [
      "KTX được quản lý theo tòa, tầng, phòng và giường để thuận tiện cho phân phòng, theo dõi tình trạng lưu trú và bảo trì.",
      "Các khu vực sinh hoạt chung, căn tin, bãi xe, khu tự học và camera an ninh hỗ trợ nhu cầu học tập, nghỉ ngơi hằng ngày.",
    ],
  },
  {
    id: "eligibility",
    label: "Đối tượng đăng ký",
    title: "Sinh viên đủ điều kiện nội trú",
    body: [
      "Sinh viên STU đang theo học, có nhu cầu ở ký túc xá và đáp ứng quy định xét duyệt của từng đợt đăng ký có thể nộp hồ sơ trực tuyến.",
      "Những trường hợp có minh chứng ưu tiên cần cập nhật đầy đủ để hệ thống hỗ trợ xét duyệt chính xác.",
    ],
  },
  {
    id: "rules",
    label: "Quy định lưu trú",
    title: "Nếp sống an toàn và có trách nhiệm",
    body: [
      "Sinh viên nội trú cần tuân thủ quy định về giờ giấc, vệ sinh, an toàn phòng cháy chữa cháy và bảo quản tài sản chung.",
      "Các yêu cầu hỗ trợ, đổi phòng, đổi giường, gia hạn hoặc thanh toán được thực hiện trên hệ thống để ban quản lý tiếp nhận và xử lý.",
    ],
  },
  {
    id: "contact",
    label: "Liên hệ",
    title: "Thông tin hỗ trợ",
    body: [
      "Ban quản lý KTX tiếp nhận hỗ trợ trong khung giờ làm việc qua điện thoại, email hoặc trực tiếp tại khu ký túc xá.",
      "Sinh viên nên theo dõi thông báo trên hệ thống để không bỏ lỡ các mốc đăng ký, thanh toán và gia hạn lưu trú.",
    ],
  },
];

const introStats: IntroStat[] = [
  { icon: Building2, value: "01", label: "Tòa nhà" },
  { icon: BedDouble, value: "42", label: "Giường" },
  { icon: Droplets, value: "Miễn phí", label: "Nước sinh hoạt" },
  { icon: ShieldCheck, value: "24/24", label: "Bảo vệ" },
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
  const [isIntroModalOpen, setIsIntroModalOpen] = useState(false);
  const [activeIntroTab, setActiveIntroTab] = useState<IntroTabKey>("overview");
  const activeIntroContent = introTabs.find((tab) => tab.id === activeIntroTab) ?? introTabs[0];

  useEffect(() => {
    // "processing" (đã xếp hạng ít nhất 1 lần) vẫn coi như đang mở nhận đơn cho tới khi qua
    // đúng 17:00 ngày end_date — khớp RegistrationController::findOpenSubmissionPeriod() ở
    // BE, tránh trang chủ "vớt nhầm" đợt khác khi có nhiều đợt cùng lúc.
    const isOpenProcessing = (p: RegistrationPeriodData) => {
      if (p.status !== "processing") return false;
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(p.end_date ?? "");
      if (!match) return true;
      const [, y, m, d] = match;
      const deadline = new Date(Number(y), Number(m) - 1, Number(d), 17, 0, 0);
      return new Date() <= deadline;
    };

    getRegistrationPeriods()
      .then((periods) => {
        const found =
          periods.find((p) => p.status === "active" || isOpenProcessing(p)) ??
          periods.find((p) => p.status === "pending") ??
          periods[0] ??
          null;
        setActivePeriod(found);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isIntroModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsIntroModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isIntroModalOpen]);

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

        {isIntroModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#081636]/55 px-4 py-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="intro-modal-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setIsIntroModalOpen(false);
              }
            }}
          >
            <div className="max-h-[88vh] w-full max-w-[900px] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_28px_80px_rgba(8,22,54,0.28)]">
              <div className="flex items-center justify-between border-b border-[#e6edf8] px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-primary-hover)]">
                    KTX STU
                  </p>
                  <h3 id="intro-modal-title" className="mt-1 text-lg font-extrabold text-[var(--color-title)]">
                    Tìm hiểu ký túc xá
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsIntroModalOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d9e4f4] bg-white text-[#6f84ad] transition-all duration-300 ease-out hover:border-[#c8d8f0] hover:text-[var(--color-primary)] hover:shadow-[0_12px_24px_rgba(17,40,97,0.10)]"
                  aria-label="Đóng"
                >
                  <X size={19} strokeWidth={2.2} />
                </button>
              </div>

              <div className="grid max-h-[calc(88vh-78px)] overflow-y-auto md:grid-cols-[240px_1fr]">
                <nav className="border-b border-[#e6edf8] bg-[#f7faff] p-4 md:border-b-0 md:border-r">
                  <div className="grid gap-2">
                    {introTabs.map((tab) => {
                      const isActive = tab.id === activeIntroTab;

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveIntroTab(tab.id)}
                          className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all duration-300 ease-out ${
                            isActive
                              ? "bg-white text-[var(--color-primary)] shadow-[0_12px_24px_rgba(17,40,97,0.10)]"
                              : "text-[#62789f] hover:bg-white/70 hover:text-[var(--color-primary)]"
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </nav>

                <div className="p-5 sm:p-7">
                  <h4 className="text-[1.35rem] font-extrabold leading-tight text-[var(--color-title)]">
                    {activeIntroContent.title}
                  </h4>
                  <div className="mt-4 space-y-4 text-[0.98rem] leading-7 text-[var(--color-content)]">
                    {activeIntroContent.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <section
          data-reveal
          className="auth-reveal is-visible"
          style={revealStyle(60)}
        >
          <article className={`${surfaceClassName} overflow-hidden p-4 sm:p-5 lg:p-6`}>
            <div className="grid gap-6">
              <div className="flex flex-col justify-center px-1 py-2 sm:px-2 lg:px-6">
                <h2 className="text-[1.65rem] font-extrabold leading-tight text-[var(--color-title)] sm:text-[2rem]">
                  Giới thiệu tổng quan về Hệ thống Quản lý Ký túc xá STU
                </h2>
                <p className="mt-4 max-w-2xl text-[1rem] leading-7 text-[var(--color-content)]">
                  Ký túc xá STU mang đến môi trường lưu trú an toàn, thuận tiện cho sinh viên trong suốt quá trình học tập. Hệ thống hỗ trợ đăng ký nội trú và quản lý lưu trú trực tuyến.
                </p>
                <Link
                  to="/about"
                  className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(36,76,184,0.22)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] hover:shadow-[0_18px_34px_rgba(36,76,184,0.28)]"
                >
                  Tìm hiểu thêm
                  <ArrowRight size={17} strokeWidth={2.2} />
                </Link>
              </div>
            </div>
          </article>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {introStats.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.label}
                  data-reveal
                  style={revealStyle(110 + index * 60)}
                  className="rounded-[18px] border border-[#d9e4f4] bg-white p-5 shadow-[0_12px_26px_rgba(17,40,97,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#c8d8f0] hover:shadow-[0_20px_40px_rgba(17,40,97,0.12)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#eef3ff_0%,#f5f9ff_100%)] text-[var(--color-primary)] shadow-[0_10px_20px_rgba(36,76,184,0.08)]">
                    <Icon size={22} strokeWidth={2.1} />
                  </div>
                  <div className="mt-4 text-[1.65rem] font-extrabold leading-none text-[var(--color-title)]">
                    {item.value}
                  </div>
                  <div className="mt-2 text-sm font-bold text-[var(--color-content)]">
                    {item.label}
                  </div>
                </article>
              );
            })}
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
