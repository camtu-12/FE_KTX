import { BedDouble, Building2 } from "lucide-react";

type AuthShowcaseProps = {
  eyebrow: string;
  title: string;
  description: string;
};

const stats = [
  { value: "19", label: "Phòng nội trú" },
  { value: "14", label: "Giường mỗi phòng" },
  { value: "Online", label: "Đăng ký và theo dõi" },
];

export default function AuthShowcase({
  eyebrow,
  title,
  description,
}: AuthShowcaseProps) {
  return (
    <div className="relative flex h-full min-h-[360px] flex-col justify-between overflow-hidden bg-[linear-gradient(180deg,#63C7D3_0%,#42B7C7_52%,#249FB0_100%)] px-8 py-9 text-white lg:px-12 lg:py-12 ">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_24%)]" />

      <div className="absolute left-[-8%] top-[8%] h-[28rem] w-[28rem] rounded-full border border-white/14 opacity-50" />
      <div className="absolute left-[10%] top-[2%] h-[34rem] w-[34rem] rounded-full border border-white/8 opacity-40" />

      <div className="relative z-10 flex flex-1 flex-col justify-center pl-8">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#FDE68A_0%,#FB7185_48%,#8B5CF6_100%)] shadow-[0_14px_30px_rgba(15,23,42,0.20)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/18 backdrop-blur-sm">
              <Building2 size={28} className="text-white" strokeWidth={2.4} />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,#FFFFFF_0%,#DFF8FB_100%)] text-[#249FB0] shadow-lg ring-2 ring-white/30">
              <BedDouble size={16} strokeWidth={2.3} />
            </div>
          </div>

          <div>
            <div className="text-3xl font-extrabold leading-none tracking-tight">
              STU Dormitory
            </div>
            <div className="mt-2 text-xl font-medium text-white/88">
              {eyebrow}
            </div>
          </div>
        </div>

        <h1 className="mt-12 text-3xl font-extrabold leading-tight lg:max-w-none ">
          {title}
        </h1>

        <p className="mt-5 text-lg leading-8 text-white/90">
          {description}
        </p>
      </div>

      <div className="relative z-10 mt-10 grid gap-4 sm:grid-cols-3">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-white/12 bg-white/10 px-5 py-6 backdrop-blur-sm"
          >
            <div className="text-xl font-extrabold">{item.value}</div>
            <div className="mt-2 text-sm text-white/86">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
