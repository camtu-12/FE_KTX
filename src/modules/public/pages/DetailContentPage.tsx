import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlarmClock,
  ArrowRight,
  BadgeCheck,
  BedDouble,
  BookOpen,
  Building2,
  Camera,
  Car,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Droplets,
  FileText,
  Flame,
  Home,
  Loader2,
  LogIn,
  PhoneCall,
  ShieldCheck,
  Users,
  Utensils,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { fetchStaticPage, type PageItemIcon, type StaticPage } from "../../../api/staticPageApi";

const ICON_MAP: Record<PageItemIcon, LucideIcon> = {
  BadgeCheck,
  FileText,
  ClipboardCheck,
  CreditCard,
  Home,
  Utensils,
  Car,
  BookOpen,
  Users,
  Camera,
  Flame,
  ShieldCheck,
  Wifi,
  Droplets,
  Building2,
  BedDouble,
  AlarmClock,
  PhoneCall,
};

type Props = {
  slug: string;
};

export default function DetailContentPage({ slug }: Props) {
  const [page, setPage] = useState<StaticPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchStaticPage(slug)
      .then((data) => setPage(data))
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#244cb8]" />
      </div>
    );
  }

  if (!page || !page.sections) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#7c8fb5]">
        Không tìm thấy nội dung trang.
      </div>
    );
  }

  const { sections } = page;
  const HeroIcon = ICON_MAP[sections.hero_icon] ?? ShieldCheck;

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
                {page.title}
              </h1>
              {page.summary ? (
                <p className="mt-3 max-w-2xl text-[0.96rem] leading-7 text-[#dbe5ff]">{page.summary}</p>
              ) : null}
            </div>
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] border border-white/14 bg-white/10 text-white shadow-[0_16px_34px_rgba(8,18,49,0.22)] backdrop-blur-sm md:h-24 md:w-24">
              <HeroIcon size={48} strokeWidth={1.9} />
            </div>
          </div>
        </section>

        {/* Groups */}
        {sections.groups.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {sections.groups.map((group) => {
              const Icon = ICON_MAP[group.icon] ?? ShieldCheck;

              return (
                <article
                  key={group.title}
                  className="group rounded-[26px] border border-[#d9e4f4] bg-white p-5 shadow-[0_12px_26px_rgba(17,40,97,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#c8d8f0] hover:shadow-[0_22px_42px_rgba(17,40,97,0.12)] lg:p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#eef3ff_0%,#f7fbff_100%)] text-[var(--color-primary)] shadow-[0_10px_20px_rgba(36,76,184,0.08)] transition-transform duration-300 ease-out group-hover:scale-110">
                      <Icon size={22} strokeWidth={2.1} />
                    </div>
                    <h3 className="text-[1.06rem] font-extrabold text-[var(--color-title)]">{group.title}</h3>
                  </div>

                  {group.description ? (
                    <p className="mt-4 text-sm leading-7 text-[var(--color-content)]">{group.description}</p>
                  ) : null}

                  {group.items.length > 0 ? (
                    <div className="mt-4 space-y-2.5">
                      {group.items.map((item) => (
                        <div key={item} className="flex items-start gap-2.5">
                          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#0d8d83]" strokeWidth={2.3} />
                          <span className="text-sm font-semibold leading-6 text-[var(--color-content)]">{item}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}

        {/* Steps (small numbered horizontal strip) */}
        {sections.steps.length > 0 ? (
          <section className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_48px_rgba(17,40,97,0.12)] backdrop-blur-xl lg:p-6">
            <div className="grid gap-4 md:grid-cols-4">
              {sections.steps.map((step, index) => {
                const Icon = ICON_MAP[step.icon] ?? ShieldCheck;

                return (
                  <div key={step.title} className="relative">
                    <article className="group h-full rounded-[20px] border border-[#d9e4f4] bg-[linear-gradient(180deg,#ffffff_0%,#f6f9ff_100%)] p-4 text-center shadow-[0_10px_22px_rgba(17,40,97,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#c8d8f0] hover:shadow-[0_20px_38px_rgba(17,40,97,0.12)]">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#eef3ff_0%,#f5f9ff_100%)] text-[var(--color-primary)] shadow-[0_10px_20px_rgba(36,76,184,0.08)] transition-transform duration-300 ease-out group-hover:scale-110">
                        <Icon size={20} />
                      </div>
                      <div className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-[#6c7b9c]">
                        Bước {index + 1}
                      </div>
                      <h3 className="mt-2 text-sm font-extrabold leading-6 text-[var(--color-title)]">{step.title}</h3>
                    </article>
                    {index < sections.steps.length - 1 ? (
                      <ArrowRight size={20} className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-[#8fa3ca] md:block" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Highlights (amber warning-style chips) */}
        {sections.highlights.length > 0 ? (
          <section className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-5 shadow-[0_10px_24px_rgba(175,128,32,0.08)] lg:p-6">
            {sections.highlights_title ? (
              <h2 className="auth-display text-[clamp(1.08rem,1.7vw,1.45rem)] font-extrabold text-[#5f4210]">
                {sections.highlights_title}
              </h2>
            ) : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {sections.highlights.map((item) => {
                const Icon = ICON_MAP[item.icon] ?? ShieldCheck;

                return (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-xl border border-[#fef3c7] border-l-4 border-l-[#d97706] bg-white/68 px-4 py-3 text-sm font-semibold leading-6 text-[#6c4a13] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_20px_rgba(175,128,32,0.10)]"
                  >
                    <Icon size={16} className="mt-1 shrink-0 text-[#d97706]" strokeWidth={2.3} />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Notes (plain teal-style list) */}
        {sections.notes.length > 0 ? (
          <section className="rounded-2xl border border-[#b9e6ef] bg-[#effcff] p-5 shadow-[0_10px_24px_rgba(17,124,143,0.08)] lg:p-6">
            {sections.notes_title ? (
              <h2 className="text-[clamp(1.15rem,1.8vw,1.55rem)] font-extrabold text-[#0d5d66]">
                {sections.notes_title}
              </h2>
            ) : null}
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {sections.notes.map((note) => (
                <div
                  key={note}
                  className="flex items-start gap-3 rounded-xl border border-[#c9edf3] border-l-4 border-l-[#0d8d83] bg-white/70 px-4 py-3 text-sm font-semibold leading-6 text-[#25545f] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_20px_rgba(17,124,143,0.08)]"
                >
                  <CheckCircle2 size={16} className="mt-1 shrink-0 text-[#0d8d83]" strokeWidth={2.3} />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* CTA */}
        <section className="relative overflow-hidden rounded-[28px] border border-[#163a8d] bg-[linear-gradient(165deg,#0a235f_0%,#14388e_48%,#0d2c75_100%)] p-5 text-white shadow-[0_22px_54px_rgba(10,24,74,0.22)] lg:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,229,214,0.16),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(6,16,52,0.20))]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[clamp(1.45rem,2.35vw,2.15rem)] font-bold leading-[1.22] text-white">Sẵn sàng đăng ký?</h2>
              <p className="mt-2 max-w-2xl text-[0.95rem] leading-7 text-white/74">
                Đăng nhập hệ thống để nộp hồ sơ nội trú ngay khi đợt đăng ký đang mở.
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
