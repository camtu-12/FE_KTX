import { useEffect, useMemo, useState } from "react";
import { listViolations, type ViolationRecord } from "../../../api/violationApi";

export default function AdminDashboardPage() {
  const [activities, setActivities] = useState<ViolationRecord[]>([]);

  useEffect(() => {
    let mounted = true;

    listViolations()
      .then((data) => {
        if (mounted) setActivities(data);
      })
      .catch(() => {
        if (mounted) setActivities([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      {
        label: "Tổng hoạt động",
        value: activities.length,
        className: "text-[#244cb8]",
      },
      {
        label: "Hoạt động tích cực",
        value: activities.filter((item) => item.type?.category === "positive").length,
        className: "text-emerald-700",
      },
      {
        label: "Vi phạm",
        value: activities.filter((item) => item.type?.category === "negative").length,
        className: "text-rose-700",
      },
      {
        label: "Buộc thôi ở",
        value: activities.filter((item) => item.actionTaken === "force_evicted").length,
        className: "text-[#c4364f]",
      },
    ],
    [activities],
  );

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-title)]">Dashboard Admin</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <article
            key={item.label}
            className="rounded-[22px] border border-[#d8e4f5] bg-white px-5 py-4 text-center shadow-[0_14px_30px_rgba(36,76,184,0.09)]"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7c8fb5]">{item.label}</p>
            <p className={`mt-3 text-[2rem] font-extrabold leading-none ${item.className}`}>{item.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
