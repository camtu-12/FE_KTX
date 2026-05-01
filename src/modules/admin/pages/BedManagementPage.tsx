import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Funnel } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import {
  getRegistrationRequests,
  getRegistrationRequestsInstant,
  getDormRoomsInstant,
  getDormBedsForRoomInstant,
} from "../../../api/registrationMockApi";
import type { RegistrationRequest } from "../data/registrationRequests";

type BedFilter = "all" | "unassigned" | "selected";
type BedIdSortOrder = "asc" | "desc";

const bedFilterOptions: Array<{ value: BedFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "unassigned", label: "Chưa chọn giường" },
  { value: "selected", label: "Đã chọn giường" },
];

const idSortOptions: Array<{ value: BedIdSortOrder; label: string }> = [
  { value: "desc", label: "Mới nhất trước" },
  { value: "asc", label: "Cũ nhất trước" },
];

const getRoomName = (room: { building_code: string; room_number: number }) =>
  `${room.building_code}${room.room_number}`;

export default function BedManagementPage() {
  const { headerSearchValue } = useOutletContext<AdminLayoutOutletContext>();
  const [requests, setRequests] = useState<RegistrationRequest[]>(() => getRegistrationRequestsInstant());
  const [rooms] = useState(() => getDormRoomsInstant());
  const [bedFilter, setBedFilter] = useState<BedFilter>("all");
  const [idSortOrder, setIdSortOrder] = useState<BedIdSortOrder>("desc");
  const [draftBedFilter, setDraftBedFilter] = useState<BedFilter>("all");
  const [draftIdSortOrder, setDraftIdSortOrder] = useState<BedIdSortOrder>("desc");
  const [isBedFilterOpen, setIsBedFilterOpen] = useState(false);
  const [bedFilterMenuPosition, setBedFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const bedFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isScrollToTopVisible, setIsScrollToTopVisible] = useState(false);

  const handleScrollToTop = () => {
    const scrollContainer = document.querySelector(".auth-scrollbar") as HTMLElement | null;

    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const next = await getRegistrationRequests();
      if (!mounted) return;
      setRequests(next);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isBedFilterOpen) {
      return;
    }

    const updateMenuPosition = () => {
      const buttonRect = bedFilterButtonRef.current?.getBoundingClientRect();

      if (!buttonRect) {
        return;
      }

      setBedFilterMenuPosition({
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
  }, [isBedFilterOpen]);

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

  const handleOpenBedFilter = () => {
    setDraftBedFilter(bedFilter);
    setDraftIdSortOrder(idSortOrder);
    setIsBedFilterOpen(true);
  };

  const handleResetBedFilter = () => {
    setDraftBedFilter("all");
    setBedFilter("all");
    setDraftIdSortOrder("desc");
    setIdSortOrder("desc");
    setIsBedFilterOpen(false);
  };

  const handleApplyBedFilter = () => {
    setBedFilter(draftBedFilter);
    setIdSortOrder(draftIdSortOrder);
    setIsBedFilterOpen(false);
  };

  // Only show students that have been assigned a room
  const assignedStudents = useMemo(() => requests.filter((r) => r.assigned_room_id != null), [requests]);

  const visibleStudents = useMemo(() => {
    const normalized = (headerSearchValue ?? "").trim().toLowerCase();

    const filtered = assignedStudents.filter((r) => {
      const matchesKeyword =
        !normalized ||
        [r.formData.mssv, r.formData.fullName, r.email]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      const matchesBedFilter = bedFilter === "all" ? true : bedFilter === "unassigned" ? r.bedId == null : r.bedId != null;

      return matchesKeyword && matchesBedFilter;
    });

    return [...filtered].sort((a, b) => {
      if (idSortOrder === "desc") return b.id - a.id;
      return a.id - b.id;
    });
  }, [assignedStudents, bedFilter, idSortOrder, headerSearchValue]);

  const roomNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const room of rooms) {
      m.set(room.id, getRoomName(room));
    }
    return m;
  }, [rooms]);

  const findBedLabel = (request: RegistrationRequest) => {
    if (!request.bedId) return "Chưa chọn";
    const roomId = request.assigned_room_id;
    if (!roomId) return "Chưa chọn";
    const beds = getDormBedsForRoomInstant(roomId);
    const bed = beds.find((b) => b.id === request.bedId);
    if (!bed) return "Chưa chọn";
    const pos = bed.position === "upper" ? "Trên" : "Dưới";
    return `Giường ${bed.bed_number} (${pos})`;
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex min-h-full flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
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
        <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-sm transition-all duration-300 ease-out hover:shadow-[0_24px_56px_rgba(36,76,184,0.14)] sm:px-8">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Quản lý giường</h1>
            <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[#62789f] sm:text-sm">
              Danh sách sinh viên đã được phân phòng và trạng thái chọn giường.
            </p>
          </div>
        </div>

        <div className="relative mt-1 overflow-hidden rounded-[14px] border border-[#d6e2f1] bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[20%]" />
                <col className="w-[22%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                  <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">MSSV</th>
                  <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Họ tên</th>
                  <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Email</th>
                  <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Phòng</th>
                  <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Giường</th>
                  <th className="relative z-30 px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                    <div className="inline-flex items-center justify-center gap-2">
                      <span>Trạng thái</span>
                      <button
                        ref={bedFilterButtonRef}
                        type="button"
                        onClick={isBedFilterOpen ? () => setIsBedFilterOpen(false) : handleOpenBedFilter}
                        className={`flex items-center justify-center transition ${
                          bedFilter !== "all" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"
                        }`}
                        aria-label="Lọc trạng thái chọn giường"
                        title="Lọc trạng thái chọn giường"
                      >
                        <Funnel className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => {
                  const isBedSelected = Boolean(student.bedId);
                  const roomName = student.assigned_room_id ? roomNameById.get(student.assigned_room_id) ?? "" : "";

                  return (
                    <tr key={student.id} className="group transition duration-200 hover:bg-[#f8fbff]">
                      <td className="border-t border-[#e8eef8] px-4 py-4 text-center text-[15px] font-semibold text-[#24407f]">
                        {student.formData.mssv}
                      </td>
                      <td className="border-t border-[#e8eef8] px-5 py-4 text-center text-sm font-semibold text-[#1f3152]">
                        {student.formData.fullName}
                      </td>
                      <td className="border-t border-[#e8eef8] px-4 py-4 text-center text-[15px] text-[#5d7299]">
                        <p className="whitespace-nowrap">{student.email}</p>
                      </td>
                      <td className="border-t border-[#e8eef8] px-4 py-4 text-center text-[15px] text-[#5d7299]">{roomName}</td>
                      <td className="border-t border-[#e8eef8] px-4 py-4 text-center text-[15px] text-[#1f3152]">{findBedLabel(student)}</td>
                      <td className="border-t border-[#e8eef8] px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                            isBedSelected
                              ? "border-[#b9e6c7] bg-[#effcf3] text-[#16784b]"
                              : "border-[#f3dd9c] bg-[#fff8df] text-[#9b6b00]"
                          }`}
                        >
                          {isBedSelected ? "Đã chọn giường" : "Chưa chọn giường"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {visibleStudents.length === 0 ? (
          <div className="rounded-xl border border-[#d8e3f2] bg-[#f8fbff] px-4 py-3 text-sm text-[#5a7197]">
            Không có sinh viên phù hợp với bộ lọc.
          </div>
        ) : null}
      </motion.section>

      {isBedFilterOpen && bedFilterMenuPosition
        ? createPortal(
            <div className="fixed inset-0 z-[68]" onClick={() => setIsBedFilterOpen(false)}>
              <<div
                className="absolute w-[200px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
                style={{ top: bedFilterMenuPosition.top, left: bedFilterMenuPosition.left - 30 }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-0.5 p-2.5">
                  {bedFilterOptions.map((option) => {
                    const isSelected = draftBedFilter === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDraftBedFilter(option.value)}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                      >
                        <span className={`inline-flex h-3 w-3 items-center justify-center rounded-full ${isSelected ? 'bg-[#244cb8]' : 'border bg-white'}`}></span>
                        <span className="ml-1 text-sm font-semibold">{option.label}</span>
                      </button>
                    );
                  })}

                  <div className="mt-2 border-t pt-2">
                    <div className="text-xs font-semibold text-[#6f84ad]">SẮP XẾP ID</div>
                    {idSortOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDraftIdSortOrder(opt.value)}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                      >
                        <span className={`inline-flex h-3 w-3 items-center justify-center rounded-full ${draftIdSortOrder === opt.value ? 'bg-[#244cb8]' : 'border bg-white'}`}></span>
                        <span className="ml-1 text-sm font-semibold">{opt.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <button type="button" onClick={handleResetBedFilter} className="text-sm font-semibold text-[#9aaed3]">
                      Reset
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBedFilter(draftBedFilter);
                          setIdSortOrder(draftIdSortOrder);
                          setIsBedFilterOpen(false);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_42%,#31b7d4_100%)] px-4 py-1 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(36,76,184,0.18)]"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
import { motion } from "framer-motion";
import { BedDouble, BedSingle, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import {
  getDormBedsForRoomInstant,
  getDormRoomsInstant,
  getRegistrationRequests,
  getRegistrationRequestsInstant,
  type DormBed,
  type DormRoom,
} from "../../../api/registrationMockApi";
import type { RegistrationRequest } from "../data/registrationRequests";

type BedRow = {
  roomId: number;
  roomName: string;
  bedId: number;
  bedNumber: number;
  bedStatus: DormBed["status"];
  occupant: RegistrationRequest | null;
};

const getRoomName = (room: DormRoom) => `${room.building_code}${room.room_number}`;

export default function BedManagementPage() {
  const { headerSearchValue } = useOutletContext<AdminLayoutOutletContext>();
  const [requests, setRequests] = useState<RegistrationRequest[]>(() => getRegistrationRequestsInstant());
  const [rooms, setRooms] = useState<DormRoom[]>(() => getDormRoomsInstant());

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const nextRequests = await getRegistrationRequests();
      if (!isMounted) {
        return;
      }
      setRequests(nextRequests);
      setRooms(getDormRoomsInstant());
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const roomNameById = useMemo(() => {
    const map = new Map<number, string>();
    rooms.forEach((room) => map.set(room.id, getRoomName(room)));
    return map;
  }, [rooms]);

  const latestRequests = useMemo(() => {
    const latestByEmail = new Map<string, RegistrationRequest>();

    requests.forEach((request) => {
      const key = request.email.trim().toLowerCase();
      const current = latestByEmail.get(key);
      if (!current || request.id > current.id) {
        latestByEmail.set(key, request);
      }
    });

    return Array.from(latestByEmail.values());
  }, [requests]);

  const occupantByBedId = useMemo(() => {
    const map = new Map<number, RegistrationRequest>();
    latestRequests.forEach((request) => {
      if (request.status !== "approved") {
        return;
      }
      if (!request.bedId) {
        return;
      }
      map.set(request.bedId, request);
    });
    return map;
  }, [latestRequests]);

  const allBedRows = useMemo(() => {
    const rows: BedRow[] = [];

    rooms.forEach((room) => {
      const roomName = roomNameById.get(room.id) ?? getRoomName(room);
      const beds = getDormBedsForRoomInstant(room.id);

      beds.forEach((bed) => {
        rows.push({
          roomId: room.id,
          roomName,
          bedId: bed.id,
          bedNumber: bed.bed_number,
          bedStatus: bed.status,
          occupant: occupantByBedId.get(bed.id) ?? null,
        });
      });
    });

    return rows.sort((a, b) => {
      const roomDiff = a.roomName.localeCompare(b.roomName);
      if (roomDiff !== 0) {
        return roomDiff;
      }
      return a.bedNumber - b.bedNumber;
    });
  }, [occupantByBedId, roomNameById, rooms]);

  const visibleBedRows = useMemo(() => {
    const normalized = headerSearchValue.trim().toLowerCase();
    if (!normalized) {
      return allBedRows;
    }

    return allBedRows.filter((row) => {
      if (!row.occupant) {
        return false;
      }

      return [row.occupant.formData.mssv, row.occupant.formData.fullName, row.occupant.email]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [allBedRows, headerSearchValue]);

  const summary = useMemo(() => {
    const totalBeds = allBedRows.length;
    const occupiedBeds = allBedRows.filter((row) => row.bedStatus === "occupied").length;
    const availableBeds = totalBeds - occupiedBeds;
    const occupiedWithStudent = allBedRows.filter((row) => Boolean(row.occupant)).length;

    return { totalBeds, occupiedBeds, availableBeds, occupiedWithStudent };
  }, [allBedRows]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex min-h-full flex-col gap-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1a2d52]">Quản lý giường</h1>
          <p className="mt-1 text-sm text-[#5c7094]">
            Tra cứu tình trạng giường theo phòng và tìm kiếm sinh viên từ thanh tìm kiếm trên header.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-[#cfe0f6] bg-white/70 px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#5c7094]">
              <BedDouble className="h-4 w-4 text-[#2f63d8]" />
              Tổng giường
            </div>
            <div className="mt-1 text-lg font-bold text-[#1a2d52]">{summary.totalBeds}</div>
          </div>
          <div className="rounded-2xl border border-[#cfe0f6] bg-white/70 px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#5c7094]">
              <BedSingle className="h-4 w-4 text-[#bf3e53]" />
              Đã chiếm
            </div>
            <div className="mt-1 text-lg font-bold text-[#1a2d52]">{summary.occupiedBeds}</div>
          </div>
          <div className="rounded-2xl border border-[#cfe0f6] bg-white/70 px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#5c7094]">
              <BedSingle className="h-4 w-4 text-[#16784b]" />
              Còn trống
            </div>
            <div className="mt-1 text-lg font-bold text-[#1a2d52]">{summary.availableBeds}</div>
          </div>
          <div className="rounded-2xl border border-[#cfe0f6] bg-white/70 px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#5c7094]">
              <UserRound className="h-4 w-4 text-[#2f63d8]" />
              Có sinh viên
            </div>
            <div className="mt-1 text-lg font-bold text-[#1a2d52]">{summary.occupiedWithStudent}</div>
          </div>
        </div>
      </header>

      <div className="overflow-hidden rounded-[22px] border border-[#cfe0f6] bg-white/70 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <div className="max-h-[calc(100vh-21rem)] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[linear-gradient(180deg,#f7fbff_0%,#edf4ff_100%)] text-xs font-semibold uppercase tracking-wide text-[#5c7094]">
              <tr>
                <th className="px-5 py-3">Phòng</th>
                <th className="px-5 py-3">Giường</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3">MSSV</th>
                <th className="px-5 py-3">Họ tên</th>
                <th className="px-5 py-3">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d8e6fb]">
              {visibleBedRows.length > 0 ? (
                visibleBedRows.map((row) => (
                  <tr key={row.bedId} className="hover:bg-white/60">
                    <td className="px-5 py-3 font-semibold text-[#24407f]">{row.roomName}</td>
                    <td className="px-5 py-3 font-semibold text-[#1a2d52]">#{row.bedNumber}</td>
                    <td className="px-5 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                          row.bedStatus === "occupied"
                            ? "bg-[#fff1f3] text-[#bf3e53]"
                            : "bg-[#e9fff3] text-[#16784b]",
                        ].join(" ")}
                      >
                        {row.bedStatus === "occupied" ? "Đã chiếm" : "Trống"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#1a2d52]">{row.occupant?.formData.mssv ?? "—"}</td>
                    <td className="px-5 py-3 text-[#1a2d52]">{row.occupant?.formData.fullName ?? "—"}</td>
                    <td className="px-5 py-3 text-[#1a2d52]">{row.occupant?.email ?? "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm font-semibold text-[#5c7094]">
                    Không có dữ liệu phù hợp với từ khóa tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.section>
  );
}
