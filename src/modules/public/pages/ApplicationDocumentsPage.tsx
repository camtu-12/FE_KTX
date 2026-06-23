import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileImage,
  IdCard,
  UploadCloud,
  UserRound,
} from "lucide-react";

type DocumentGroup = {
  title: string;
  icon: LucideIcon;
  items: string[];
};

type PrepareStep = {
  title: string;
  icon: LucideIcon;
};

const documentGroups: DocumentGroup[] = [
  {
    title: "Thông tin cá nhân",
    icon: UserRound,
    items: [
      "Họ và tên",
      "MSSV",
      "Ngày sinh",
      "Giới tính",
      "Số điện thoại",
      "Email sinh viên",
    ],
  },
  {
    title: "CCCD/CMND",
    icon: IdCard,
    items: [
      "CCCD còn hiệu lực",
      "Ảnh mặt trước",
      "Ảnh mặt sau",
      "Hình ảnh rõ nét",
    ],
  },
  {
    title: "Ảnh chân dung",
    icon: FileImage,
    items: ["Ảnh thẻ hoặc ảnh chân dung", "Khuôn mặt rõ ràng", "Không bị mờ"],
  },
  {
    title: "Giấy tờ ưu tiên (nếu có)",
    icon: FileCheck2,
    items: [
      "Hộ nghèo",
      "Cận nghèo",
      "Gia đình chính sách",
      "Hoàn cảnh khó khăn",
      "Các minh chứng ưu tiên khác",
    ],
  },
];

const notes = [
  "Thông tin khai báo phải chính xác.",
  "Giấy tờ tải lên phải rõ ràng và đầy đủ.",
  "Hồ sơ không hợp lệ có thể bị từ chối xét duyệt.",
  "Sinh viên chịu trách nhiệm về tính chính xác của thông tin cung cấp.",
];

const prepareSteps: PrepareStep[] = [
  {
    title: "Chuẩn bị thông tin cá nhân",
    icon: UserRound,
  },
  {
    title: "Chuẩn bị CCCD và ảnh",
    icon: IdCard,
  },
  {
    title: "Bổ sung giấy tờ ưu tiên (nếu có)",
    icon: FileCheck2,
  },
  {
    title: "Nộp hồ sơ trực tuyến",
    icon: UploadCloud,
  },
];

export default function ApplicationDocumentsPage() {
  return (
    <div className="auth-font relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[20rem] bg-[radial-gradient(circle_at_top_left,rgba(63,110,235,0.18),transparent_32%),radial-gradient(circle_at_86%_10%,rgba(123,229,214,0.14),transparent_18%),linear-gradient(180deg,rgba(244,248,255,0.98)_0%,rgba(235,240,247,0)_100%)]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 lg:gap-8 lg:py-7">
        <section className="relative overflow-hidden rounded-[30px] border border-[#163a8d] bg-[linear-gradient(160deg,#091f56_0%,#123b9f_48%,#0d2c75_100%)] px-6 py-6 text-white shadow-[0_22px_54px_rgba(10,24,74,0.22)] sm:px-8 lg:px-9 lg:py-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_88%_24%,rgba(123,229,214,0.16),transparent_16%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(6,16,52,0.20))]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="mt-4 text-[clamp(1.65rem,3vw,2.55rem)] font-bold leading-[1.22] tracking-normal text-white">
                Hồ sơ cần chuẩn bị khi đăng ký nội trú
              </h1>

              <p className="mt-3 max-w-3xl text-[0.96rem] leading-7 text-[#dbe5ff]">
                Sinh viên cần chuẩn bị đầy đủ thông tin và giấy tờ trước khi nộp
                hồ sơ đăng ký ký túc xá để quá trình xét duyệt diễn ra thuận lợi.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_48px_rgba(17,40,97,0.12)] backdrop-blur-xl lg:p-6">
          <h2 className="text-[clamp(1.25rem,2vw,1.8rem)] font-extrabold leading-[1.2] text-[var(--color-title)]">
            Các giấy tờ và thông tin cần có
          </h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {documentGroups.map((group) => {
              const Icon = group.icon;

              return (
                <article
                  key={group.title}
                  className="group rounded-[20px] border border-[#d9e4f4] bg-white p-5 shadow-[0_12px_26px_rgba(17,40,97,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#c8d8f0] hover:shadow-[0_22px_42px_rgba(17,40,97,0.12)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#eef3ff_0%,#f7fbff_100%)] text-[var(--color-primary)] shadow-[0_10px_22px_rgba(36,76,184,0.08)] transition-transform duration-300 ease-out group-hover:scale-110">
                      <Icon size={22} strokeWidth={2.1} />
                    </div>
                    <h3 className="text-[1.05rem] font-extrabold text-[var(--color-title)]">
                      {group.title}
                    </h3>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <div key={item} className="flex items-center gap-2.5">
                        <CheckCircle2
                          size={16}
                          className="shrink-0 text-[#0d8d83]"
                          strokeWidth={2.3}
                        />
                        <span className="text-sm font-semibold leading-6 text-[var(--color-content)]">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[#b9e6ef] bg-[#effcff] p-5 shadow-[0_10px_24px_rgba(17,124,143,0.08)] lg:p-6">
          <h2 className="text-[clamp(1.15rem,1.8vw,1.55rem)] font-extrabold text-[#0d5d66]">
            Lưu ý quan trọng
          </h2>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {notes.map((note) => (
              <div
                key={note}
                className="flex items-start gap-3 rounded-xl border border-[#c9edf3] border-l-4 border-l-[#0d8d83] bg-white/70 px-4 py-3 text-sm font-semibold leading-6 text-[#25545f] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_20px_rgba(17,124,143,0.08)]"
              >
                <CheckCircle2
                  size={16}
                  className="mt-1 shrink-0 text-[#0d8d83]"
                  strokeWidth={2.3}
                />
                <span>{note}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_48px_rgba(17,40,97,0.12)] backdrop-blur-xl lg:p-6">
          <h2 className="text-[clamp(1.25rem,2vw,1.8rem)] font-extrabold leading-[1.2] text-[var(--color-title)]">
            Quy trình chuẩn bị hồ sơ
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {prepareSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="relative">
                  <article className="group h-full rounded-[20px] border border-[#d9e4f4] bg-[linear-gradient(180deg,#ffffff_0%,#f6f9ff_100%)] p-4 text-center shadow-[0_10px_22px_rgba(17,40,97,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#c8d8f0] hover:shadow-[0_20px_38px_rgba(17,40,97,0.12)]">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#eef3ff_0%,#f5f9ff_100%)] text-[var(--color-primary)] shadow-[0_10px_20px_rgba(36,76,184,0.08)] transition-transform duration-300 ease-out group-hover:scale-110">
                      <Icon size={20} />
                    </div>
                    <div className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-[#6c7b9c]">
                      Bước {index + 1}
                    </div>
                    <h3 className="mt-2 text-sm font-extrabold leading-6 text-[var(--color-title)]">
                      {step.title}
                    </h3>
                  </article>
                  {index < prepareSteps.length - 1 ? (
                    <ArrowRight
                      size={20}
                      className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-[#8fa3ca] md:block"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
