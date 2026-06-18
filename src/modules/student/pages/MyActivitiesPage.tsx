import { motion } from "framer-motion";
import { CalendarDays, ClipboardCheck, Filter, NotebookText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listViolationsByStudentEmail, type ViolationRecord } from "../../../api/violationApi";
import type { ActivityCategory, ViolationLevel } from "../../../api/violationTypeApi";
import { formatDate } from "../../../utils/dateFormat";
import { useAuthStore } from "../../auth/store";

type ActivityFilter = ActivityCategory | "all";

const categoryMeta: Record<ActivityCategory, { label: string; className: string }> = {
  positive: {
    label: "Hoạt động tích cực",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  negative: {
    label: "Vi phạm",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

const levelMeta: Record<ViolationLevel, { label: string; className: string }> = {
  MINOR: {
    label: "MINOR",
    className: "border-yellow-200 bg-yellow-50 text-yellow-700",
  },
  MEDIUM: {
    label: "MEDIUM",
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
  SERIOUS: {
    label: "SERIOUS",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

const actionMeta: Record<NonNullable<ViolationRecord["actionTaken"]>, { label: string; className: string }> = {
  reward_recorded: {
    label: "Đã ghi nhận",
    className: "border-emerald-200 bg-emerald-100 text-emerald-800",
  },
  reminded: {
    label: "Nhắc nhở",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  warned: {
    label: "Cảnh cáo",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  force_evicted: {
    label: "Buộc thôi ở",
    className: "border-rose-200 bg-rose-100 text-rose-800",
  },
};

function FeedBadge({ children, className }: { children: string; className: string }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

export default function MyActivitiesPage() {
  const studentEmail = useAuthStore((state) => state.user?.email ?? "");
  const [items, setItems] = useState<ViolationRecord[]>([]);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadActivities = async () => {
      if (!studentEmail) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await listViolationsByStudentEmail(studentEmail);
        if (mounted) {
          setItems(data);
        }
      } catch {
        if (mounted) {
          setItems([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadActivities();

    return () => {
      mounted = false;
    };
  }, [studentEmail]);

  const visibleItems = useMemo(
    () => items.filter((item) => filter === "all" || item.type?.category === filter),
    [filter, items],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-5 rounded-[24px] bg-[#eef3f8] p-4 sm:p-6"
    >
      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Hoạt động của tôi</h1>
            <p className="mt-1 text-sm text-[#62789f]">Theo dõi lịch sử hoạt động tích cực và vi phạm trong thời gian lưu trú.</p>
          </div>
          <label className="relative block w-full md:w-[260px]">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f84ad]" />
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as ActivityFilter)}
              className="h-11 w-full rounded-2xl border border-[#d6e2f1] bg-white pl-9 pr-3 text-sm font-semibold text-[#1f3152] outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12"
            >
              <option value="all">Tất cả</option>
              <option value="positive">Hoạt động tích cực</option>
              <option value="negative">Vi phạm</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#d8e3f1] bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
        {isLoading ? (
          <p className="text-sm font-semibold text-[#62789f]">Đang tải lịch sử hoạt động...</p>
        ) : visibleItems.length === 0 ? (
          <p className="text-sm font-semibold text-[#62789f]">Chưa có hoạt động phù hợp với bộ lọc.</p>
        ) : (
          <div className="relative space-y-3 before:absolute before:left-4 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-[#d8e3f1]">
            {visibleItems.map((item) => {
              const category = item.type?.category ?? "negative";
              const note = item.note?.trim() ?? "";
              const action = item.actionTaken;
              const level = item.type?.level ?? "MINOR";

              return (
                <article key={item.id} className="relative pl-11">
                  <span className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#d8e3f1] bg-white text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.10)]">
                    <ClipboardCheck className="h-4 w-4" />
                  </span>
                  <div className="rounded-2xl border border-[#e2eaf6] bg-[#f8fbff] px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <h2 className="text-base font-bold leading-6 text-[#1a2d52]">{item.type?.name || "Hoạt động"}</h2>
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#62789f]">
                        <CalendarDays className="h-4 w-4" />
                        {formatDate(item.violationDate)}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <FeedBadge className={categoryMeta[category].className}>{categoryMeta[category].label}</FeedBadge>
                      {category === "negative" ? (
                        <FeedBadge className={levelMeta[level].className}>{levelMeta[level].label}</FeedBadge>
                      ) : null}
                      {action ? (
                        <FeedBadge className={actionMeta[action].className}>{actionMeta[action].label}</FeedBadge>
                      ) : null}
                    </div>

                    {note ? (
                      <div className="mt-3 flex gap-2 rounded-xl border border-[#dce6f3] bg-white px-3 py-2 text-sm text-[#5570a0]">
                        <NotebookText className="mt-0.5 h-4 w-4 shrink-0 text-[#6f84ad]" />
                        <span>
                          <span className="font-bold text-[#1b3766]">Ghi chú:</span>{" "}
                          <span className="font-semibold text-[#1b3766]">{note}</span>
                        </span>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </motion.section>
  );
}
