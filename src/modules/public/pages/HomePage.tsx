import ktxBanner from "../../../assets/ktx.png";
import {
  BedDouble,
  Building2,
  Clock3,
  Mail,
  MapPin,
  Phone,
  createLucideIcon,
} from "lucide-react";

const FacebookIcon = createLucideIcon("Facebook", [
  [
    "path",
    {
      d: "M14 8h-2a2 2 0 0 0-2 2v2H8v3h2v5h3v-5h2.5l.5-3H13v-1c0-.6.4-1 1-1h2V8z",
      fill: "currentColor",
      stroke: "none",
      key: "facebook-f",
    },
  ],
]);

const stats = [
  { label: "Số phòng", value: "320+" },
  { label: "Số giường", value: "1800+" },
  { label: "Hỗ trợ online", value: "24/7" },
];

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 pt-0 lg:pt-0">
      <section className="mx-auto w-full max-w-[1140px] overflow-hidden border border-[var(--color-border)] bg-white shadow-sm">
        <img
          src={ktxBanner}
          alt="Khuôn viên ký túc xá"
          className="h-[400px] w-full object-cover sm:h-[560px] lg:h-[760px]"
        />
      </section>


      <section className="mx-auto grid w-full max-w-[1140px] gap-6 md:grid-cols-3">
        {stats.map((item) => (
          <article
            key={item.label}
            className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-semibold text-[var(--color-content)]">{item.label}</p>
            <p className="mt-3 text-4xl font-extrabold text-[var(--color-primary-hover)]">
              {item.value}
            </p>
          </article>
        ))}
      </section>

      <section className="mx-auto w-full max-w-[1140px]  border border-[var(--color-border)] bg-white p-8 shadow-sm lg:p-10">
        <h2 className="text-2xl font-bold text-[var(--color-title)]">Giới thiệu ký túc xá</h2>
        <p className="mt-4 max-w-4xl text-base leading-8 text-[var(--color-content)]">
          Ký túc xá STU được vận hành theo mô hình hiện đại với hệ thống quản lý
          tập trung, tối ưu quy trình đăng ký nội trú, quản lý phòng ở và hỗ trợ
          sinh viên xuyên suốt quá trình học tập. Mọi thông tin từ đăng ký,
          xét duyệt đến cập nhật thông báo đều được thực hiện trên một nền tảng
          thống nhất.
        </p>
      </section>

      <footer className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[linear-gradient(135deg,var(--color-primary)_55%,var(--color-primary-hover)_100%)] text-white shadow-sm">
        <div className="grid gap-8 px-8 py-8 lg:h-[320px] lg:grid-cols-3 lg:px-10 lg:py-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#FDE68A_0%,#FB7185_48%,#8B5CF6_100%)] shadow-[0_12px_24px_rgba(15,23,42,0.18)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/18 backdrop-blur-sm">
                  <Building2 size={24} className="text-white" strokeWidth={2.4} />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[linear-gradient(135deg,#FFFFFF_0%,#DFF8FB_100%)] text-[#249FB0] shadow-lg ring-2 ring-white/30">
                  <BedDouble size={14} strokeWidth={2.3} />
                </div>
              </div>

              <div className="text-3xl font-extrabold tracking-tight">STU Dormitory</div>
            </div>

            <p className="mt-4 max-w-md text-sm leading-7 text-white/85">
              Hệ thống quản lý ký túc xá sinh viên hiện đại, hỗ trợ đăng ký nội trú,
              theo dõi phòng ở và cập nhật thông tin nhanh chóng, minh bạch.
            </p>

            <a
              href="https://www.facebook.com/DHCNSG"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook Đại học Công nghệ Sài Gòn"
              className="mt-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-transparent text-white transition hover:bg-white/12"
            >
              <FacebookIcon size={23} />
            </a>
          </div>

          <div className="lg:ml-8">
            <h3 className="text-lg font-bold">Liên hệ</h3>
            <div className="mt-4 space-y-3 text-sm text-white/85">
              <p className="flex items-start gap-2">
                <MapPin size={18} className="mt-0.5 shrink-0 text-white/90" />
                <span>Địa chỉ: 180 Cao Lỗ, Phường 4, Quận 8, TP. Hồ Chí Minh</span>
              </p>
              <p className="flex items-start gap-2">
                <Phone size={18} className="mt-0.5 shrink-0 text-white/90" />
                <span>Hotline: (028)38753588</span>
              </p>
              <p className="flex items-start gap-2">
                <Mail size={18} className="mt-0.5 shrink-0 text-white/90" />
                <span>Email: hotro.ktx@stu.edu.vn</span>
              </p>
              <p className="flex items-start gap-2">
                <Clock3 size={18} className="mt-0.5 shrink-0 text-white/90" />
                <span>Giờ hỗ trợ: 07:00 - 17:00</span>
              </p>
            </div>
          </div>

          <div>
            <div className="mt-2 h-56 overflow-hidden rounded-xl border border-white/20 bg-white/10 p-1 lg:h-[270px]">
              <iframe
                title="Bản đồ KTX Trường Đại học Công nghệ Sài Gòn"
                src="https://www.google.com/maps?q=KTX%20Truong%20Dai%20hoc%20Cong%20nghe%20Sai%20Gon&z=17&output=embed"
                className="h-full w-full rounded-lg"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-white/15 px-8 py-3 text-sm text-white/75 lg:px-10 lg:py-2">
          © 2026 STU Dormitory. Tất cả quyền được bảo lưu.
        </div>
      </footer>
    </div>
  );
}
