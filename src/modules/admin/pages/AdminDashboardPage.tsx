import { BedDouble, Clock3, CircleDollarSign, Users } from "lucide-react";

const stats = [
  {
    title: "Sinh viên nội trú",
    value: "256",
    icon: Users,
  },
  {
    title: "Phòng còn trống",
    value: "18",
    icon: BedDouble,
  },
  {
    title: "Đơn chờ duyệt",
    value: "12",
    icon: Clock3,
  },
  {
    title: "Doanh thu tháng",
    value: "320M",
    icon: CircleDollarSign,
  },
];

export default function AdminDashboardPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-title)]">Dashboard Admin</h1>
        <p className="mt-1 text-sm text-[var(--color-content)]">
          Theo dõi tổng quan hoạt động quản lý ký túc xá.
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

              <p className="mt-4 text-3xl font-extrabold text-[var(--color-title)]">{item.value}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
