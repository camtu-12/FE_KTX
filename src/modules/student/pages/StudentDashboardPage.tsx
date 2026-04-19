import { BellRing, BedSingle, CreditCard, FileCheck2 } from "lucide-react";

const stats = [
  {
    title: "Trạng thái phòng",
    value: "Đang ở",
    icon: BedSingle,
  },
  {
    title: "Đơn nội trú",
    value: "Đã duyệt",
    icon: FileCheck2,
  },
  {
    title: "Thanh toán",
    value: "Còn nợ 500K",
    icon: CreditCard,
  },
  {
    title: "Thông báo mới",
    value: "3",
    icon: BellRing,
  },
];

export default function StudentDashboardPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-title)]">Dashboard Sinh viên</h1>
        <p className="mt-1 text-sm text-[var(--color-content)]">
          Theo dõi thông tin nội trú, thanh toán và cập nhật mới nhất.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.title}
              className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--color-content)]">{item.title}</p>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary-soft)]">
                  <Icon className="h-5 w-5 text-[var(--color-primary-hover)]" />
                </div>
              </div>

              <p className="mt-4 text-2xl font-extrabold text-[var(--color-title)]">{item.value}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
