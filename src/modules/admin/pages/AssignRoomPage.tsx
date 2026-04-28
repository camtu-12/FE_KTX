import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Funnel, XCircle, ArrowUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import {
  getDormRoomsInstant,
  getRegistrationRequests,
  getRegistrationRequestsInstant,
  type DormRoom,
} from "../../../api/registrationMockApi";
import type { RegistrationRequest } from "../data/registrationRequests";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";

type AssignmentFilter = "all" | "unassigned" | "assigned";
type StudentSortOrder = "desc" | "asc";
type ToastState = { kind: "success" | "error"; message: string } | null;

const assignmentFilterOptions: Array<{ value: AssignmentFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "unassigned", label: "Chưa phân phòng" },
  { value: "assigned", label: "Đã phân phòng" },
];

const studentSortOptions: Array<{ value: StudentSortOrder; label: string }> = [
  { value: "desc", label: "Mới nhất trước" },
  { value: "asc", label: "Cũ nhất trước" },
];

const getRoomName = (room: DormRoom) => `${room.building_code}${room.room_number}`;

export default function AssignRoomPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { headerSearchValue } = useOutletContext<AdminLayoutOutletContext>();

  const [requests, setRequests] = useState<RegistrationRequest[]>(() => getRegistrationRequestsInstant());
  const [rooms, setRooms] = useState<DormRoom[]>(() => getDormRoomsInstant());
  const [toast, setToast] = useState<ToastState>(null);

  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [sortOrder, setSortOrder] = useState<StudentSortOrder>("desc");
  const [draftAssignmentFilter, setDraftAssignmentFilter] = useState<AssignmentFilter>("all");
  const [draftSortOrder, setDraftSortOrder] = useState<StudentSortOrder>("desc");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterMenuPosition, setFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isScrollToTopVisible, setIsScrollToTopVisible] = useState(false);

  const handleScrollToTop = () => {
    const scrollContainer = document.querySelector(".auth-scrollbar") as HTMLElement | null;

    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const nextRequests = await getRegistrationRequests();
      if (!isMounted) {
        return;
      }

      setRequests(nextRequests);
      setRooms(getDormRoomsInstant());
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const routeState = location.state as { toast?: ToastState } | null;
    const nextToast = routeState?.toast ?? null;

    if (!nextToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(nextToast), 0);
    navigate(location.pathname, { replace: true, state: null });

    return () => window.clearTimeout(timeoutId);
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    const updateMenuPosition = () => {
      const buttonRect = filterButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) {
        return;
      }

      setFilterMenuPosition({
        top: buttonRect.bottom + 10,
        left: buttonRect.left + buttonRect.width / 2,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isFilterOpen]);

  useEffect(() => {
    const scrollContainer = document.querySelector(".auth-scrollbar") as HTMLElement | null;

    if (!scrollContainer) {
      return;
    }

    const updateVisibility = () => {
      const threshold = Math.max(180, scrollContainer.clientHeight * 0.6);
      setIsScrollToTopVisible(scrollContainer.scrollTop > threshold);
    };

    updateVisibility();
    scrollContainer.addEventListener("scroll", updateVisibility, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timerId = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timerId);
  }, [toast]);

  const approvedStudents = useMemo(() => {
    return requests.filter((request) => request.status === "approved");
  }, [requests]);

  const visibleStudents = useMemo(() => {
    const normalized = (headerSearchValue ?? "").trim().toLowerCase();

    return approvedStudents
      .filter((student) => {
        if (assignmentFilter === "assigned") {
          if (!student.assigned_room_id) return false;
        }

        if (assignmentFilter === "unassigned") {
          if (student.assigned_room_id) return false;
        }

        if (normalized) {
          const hay = [student.formData.mssv, student.formData.fullName, student.email]
            .join(" ")
            .toLowerCase();

          if (!hay.includes(normalized)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => (sortOrder === "asc" ? a.id - b.id : b.id - a.id));
  }, [approvedStudents, assignmentFilter, sortOrder, headerSearchValue]);

  const roomNameById = useMemo(() => {
    const map = new Map<number, string>();
    rooms.forEach((room) => map.set(room.id, getRoomName(room)));
    return map;
  }, [rooms]);

  const assignedCount = approvedStudents.filter((student) => student.assigned_room_id).length;
  const unassignedCount = approvedStudents.length - assignedCount;

  const handleOpenFilter = () => {
    setDraftAssignmentFilter(assignmentFilter);
    setDraftSortOrder(sortOrder);
    setIsFilterOpen(true);
  };

  const handleApplyFilter = () => {
    setAssignmentFilter(draftAssignmentFilter);
    setSortOrder(draftSortOrder);
    setIsFilterOpen(false);
  };

  const handleResetFilter = () => {
    setDraftAssignmentFilter("all");
    setDraftSortOrder("desc");
    setAssignmentFilter("all");
    setSortOrder("desc");
    setIsFilterOpen(false);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex min-h-full flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {toast ? (
                <motion.div
                  key={`${toast.kind}-${toast.message}`}
                  initial={{ opacity: 0, y: -14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  role="status"
                  aria-live="polite"
                  className="pointer-events-none fixed left-1/2 top-6 z-[9999] w-[min(92vw,420px)] -translate-x-1/2 px-4"
                >
                  <motion.div
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_22px_60px_rgba(15,23,42,0.22)] ${
                      toast.kind === "success"
                        ? "border-[#c4d7f2] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] text-[#24407f]"
                        : "border-[#f2b8c6] bg-[linear-gradient(180deg,#ffffff_0%,#fff5f8_100%)] text-[#8f2f4b]"
                    }`}
                  >
                    <span
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                        toast.kind === "success"
                          ? "bg-[linear-gradient(135deg,#e6f0ff_0%,#d4e3ff_100%)] text-[#2f63d8]"
                          : "bg-[linear-gradient(135deg,#fff0f6_0%,#ffd6e6_100%)] text-[#cc3c4f]"
                      }`}
                    >
                      {toast.kind === "success" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 truncate text-[15px] font-semibold">{toast.message}</div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {typeof document !== "undefined" && isScrollToTopVisible
        ? createPortal(
            <div className="fixed bottom-6 right-6 z-[70]">
              <button
                type="button"
                onClick={handleScrollToTop}
                className="group inline-flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_42%,#31b7d4_100%)] text-white shadow-[0_16px_32px_rgba(36,76,184,0.28)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
                aria-label="Về đầu trang"
                title="Về đầu trang"
              >
                <ArrowUp className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
              </button>
            </div>,
            document.body,
          )
        : null}

      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Phân phòng</h1>
        <p className="mt-1 text-sm text-[#62789f]">Danh sách sinh viên đã được duyệt đơn và thao tác chọn phòng.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article className="flex flex-col items-center rounded-[24px] border border-[#d8e4f5] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-5 py-4 text-center shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7c8fb5]">Đã duyệt</p>
          <p className="mt-3 text-[2rem] font-extrabold leading-none text-[#16784b]">{approvedStudents.length}</p>
        </article>
        <article className="flex flex-col items-center rounded-[24px] border border-[#d8e4f5] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-5 py-4 text-center shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7c8fb5]">Chưa phân phòng</p>
          <p className="mt-3 text-[2rem] font-extrabold leading-none text-[#9b6b00]">{unassignedCount}</p>
        </article>
        <article className="flex flex-col items-center rounded-[24px] border border-[#d8e4f5] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-5 py-4 text-center shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7c8fb5]">Đã phân phòng</p>
          <p className="mt-3 text-[2rem] font-extrabold leading-none text-[#244cb8]">{assignedCount}</p>
        </article>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="overflow-x-auto rounded-[22px] border border-[#dde7f5] bg-white shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
          <table className="min-w-[740px] w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[22%]" />
              <col className="w-[28%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  MSSV
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  Họ tên
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  Email
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  Trạng thái
                </th>
                <th className="relative z-30 px-3 py-2.5 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  <div className="inline-flex items-center justify-center gap-2">
                    <span>Hành động</span>
                    <button
                      ref={filterButtonRef}
                      type="button"
                      onClick={isFilterOpen ? () => setIsFilterOpen(false) : handleOpenFilter}
                      className={`flex items-center justify-center transition   ${
                        assignmentFilter !== "all"
                           ? "text-[#244cb8]"
                            : "text-[#6f84ad] hover:text-[#244cb8]"
                      }`}
                      title="Bộ lọc"
                    >
                      <Funnel className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map((student) => {
                const isAssigned = Boolean(student.assigned_room_id);
                const roomName = student.assigned_room_id ? roomNameById.get(student.assigned_room_id) : null;

                return (
                  <tr key={student.id} className="transition-colors hover:bg-[#f8fbff]">
                    <td className="border-t border-[#e7eef9] px-3 py-2.5 text-center text-[15px] font-semibold text-[#1f3152]">
                      <span className="whitespace-nowrap">{student.formData.mssv}</span>
                    </td>
                    <td className="border-t border-[#e7eef9] px-3 py-2.5 text-center text-sm font-semibold text-[#1f3152]">
                      <span className="line-clamp-2">{student.formData.fullName}</span>
                    </td>
                    <td className="border-t border-[#e7eef9] px-3 py-2.5 text-center text-[15px] text-[#5d7299]">
                      <span className="truncate">{student.email}</span>
                    </td>
                    <td className="border-t border-[#e7eef9] px-3 py-2.5 text-center text-[15px]">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[14px] font-semibold ${
                          isAssigned
                            ? "border-[#b9e6c7] bg-[#effcf3] text-[#16784b]"
                            : "border-[#f3dd9c] bg-[#fff8df] text-[#9b6b00]"
                        }`}
                      >
                        {isAssigned ? `Đã phân phòng${roomName ? `: ${roomName}` : ""}` : "Chưa phân phòng"}
                      </span>
                    </td>
                    <td className="border-t border-[#e7eef9] px-3 py-2.5 text-center ">
                      <button
                        type="button"
                        disabled={isAssigned}
                        onClick={() => navigate(`/admin/assign-room/${student.id}`)}
                        className={`auth-btn-gloss inline-flex min-w-[108px] flex-nowrap items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition duration-200 ${
                          isAssigned
                            ? "border border-[#d2def0] bg-[linear-gradient(135deg,#edf4ff_0%,#dfeaff_100%)] text-[#7f8da8] shadow-[0_10px_18px_rgba(36,76,184,0.10)] disabled:opacity-100"
                            : "bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] hover:-translate-y-0.5 hover:brightness-110"
                        }`}
                      >
                        <span className="auth-btn-gloss__content">{isAssigned ? "Đã phân phòng" : "Chọn phòng"}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {visibleStudents.length === 0 ? (
          <div className="mt-3 rounded-xl border border-[#d8e3f2] bg-[#f8fbff] px-4 py-3 text-sm text-[#5a7197]">
            Không có sinh viên phù hợp với bộ lọc.
          </div>
        ) : null}
      </div>

      {isFilterOpen && filterMenuPosition
        ? createPortal(
            <div className="fixed inset-0 z-[70]" onClick={() => setIsFilterOpen(false)}>
              <div
                className="absolute w-[160px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
                style={{ top: filterMenuPosition.top, left: filterMenuPosition.left }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-0.5 p-2.5">
                  {assignmentFilterOptions.map((option) => {
                    const isSelected = draftAssignmentFilter === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDraftAssignmentFilter(option.value)}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                            isSelected ? "border-[#244cb8] bg-[#244cb8]/10" : "border-[#cfd9e8] bg-white"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-[#244cb8]" : "bg-transparent"}`} />
                        </span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}

                  <div className="mt-2 border-t border-[#dbe5f3] pt-2">
                    <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7a8eb6]">
                      Sắp xếp ID
                    </p>
                    {studentSortOptions.map((option) => {
                      const isSelected = draftSortOrder === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setDraftSortOrder(option.value)}
                          className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                              isSelected ? "border-[#244cb8] bg-[#244cb8]/10" : "border-[#cfd9e8] bg-white"
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-[#244cb8]" : "bg-transparent"}`} />
                          </span>
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#dbe5f3] px-2.5 py-2">
                  <button
                    type="button"
                    onClick={handleResetFilter}
                    className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyFilter}
                    className="rounded-xl bg-[#0c4f97] px-3 py-1.5 text-[10px] font-semibold tracking-normal text-white shadow-[0_8px_16px_rgba(12,79,151,0.22)] transition hover:brightness-110"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </motion.section>
  );
}
