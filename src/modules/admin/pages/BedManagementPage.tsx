import { motion } from "framer-motion";
import { ArrowUp, CheckCircle2, Clock3, Funnel } from "lucide-react";
import {
  getRegistrations,
} from "../../../api/registrationService";
import { listRooms, type RoomApi } from "../../../api/roomApi";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DormRoom } from "../../../types/dormRoom";
import { useOutletContext } from "react-router-dom";
import { createPortal } from "react-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import type { RegistrationRequest } from "../data/registrationRequests";

const getRoomName = (room: DormRoom) => `${room.building_code}${room.room_number}`;

const getGenderLabel = (gender?: string | null) => {
  const normalized = String(gender ?? "").trim().toLowerCase();

  if (normalized === "male" || normalized === "nam") {
    return "Nam";
  }

  if (normalized === "female" || normalized === "nữ" || normalized === "nu") {
    return "Nữ";
  }

  return "-";
};

const getGenderFilterValue = (gender?: string | null): GenderFilter => {
  const normalized = String(gender ?? "").trim().toLowerCase();

  if (normalized === "male" || normalized === "nam") {
    return "male";
  }

  if (normalized === "female" || normalized === "nữ" || normalized === "nu") {
    return "female";
  }

  return "all";
};

const mapRoomApiToDormRoom = (room: RoomApi): DormRoom => ({
  id: room.id,
  building_code: room.building_code,
  room_number: room.room_number,
  totalBeds: room.capacity,
  availableBeds: room.available_beds,
  capacity: room.capacity,
  gender: room.floor?.gender ?? null,
  floor_id: room.floor_id,
  floor: room.floor
    ? {
        id: room.floor.id,
        building_code: room.floor.building_code,
        floor_number: room.floor.floor_number,
        gender: room.floor.gender ?? undefined,
      }
    : undefined,
  floor_number: room.floor_number,
  beds: room.beds.map((bed) => {
    const bedNumber = Number(bed.bed_number);

    return {
      id: bed.id,
      room_id: bed.room_id,
      bed_number: Number.isFinite(bedNumber) ? bedNumber : bed.id,
      position: bed.position === "LOWER" ? "lower" : "upper",
      status: bed.status === "MAINTENANCE" ? "maintenance" : "active",
    };
  }),
});

type BedSelectionFilter = "all" | "selected" | "not_selected";
type BedSelectionSortOrder = "desc" | "asc";
type GenderFilter = "all" | "male" | "female";

const filterOptions: Array<{ value: BedSelectionFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "selected", label: "Đã chọn" },
  { value: "not_selected", label: "Chưa chọn" },
];

const idSortOptions: Array<{ value: BedSelectionSortOrder; label: string }> = [
  { value: "desc", label: "Mới nhất trước" },
  { value: "asc", label: "Cũ nhất trước" },
];

const genderFilterOptions: Array<{ value: GenderFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
];

const getSelectionMeta = (request: RegistrationRequest) => {
  if (request.bedId) {
    return {
      label: "Đã chọn",
      badgeClassName: "border border-emerald-200 bg-emerald-50 text-emerald-700",
      Icon: CheckCircle2,
    };
  }

  return {
    label: "Chưa chọn",
    badgeClassName: "border border-amber-200 bg-amber-50 text-amber-700",
    Icon: Clock3,
  };
};

export default function BedManagementPage() {
  const { headerSearchValue } = useOutletContext<AdminLayoutOutletContext>();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [rooms, setRooms] = useState<DormRoom[]>([]);
  const [selectionFilter, setSelectionFilter] = useState<BedSelectionFilter>("all");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [sortOrder, setSortOrder] = useState<BedSelectionSortOrder>("desc");
  const [draftSelectionFilter, setDraftSelectionFilter] = useState<BedSelectionFilter>("all");
  const [draftGenderFilter, setDraftGenderFilter] = useState<GenderFilter>("all");
  const [draftSortOrder, setDraftSortOrder] = useState<BedSelectionSortOrder>("desc");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isGenderFilterOpen, setIsGenderFilterOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const genderFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const [filterMenuPosition, setFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [genderFilterMenuPosition, setGenderFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isScrollToTopVisible, setIsScrollToTopVisible] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [registrationsRes, roomsRes] = await Promise.all([
          getRegistrations(),
          listRooms(),
        ]);

        if (!isMounted) return;

        setRequests(registrationsRes);
        setRooms(roomsRes.map(mapRoomApiToDormRoom));
      } catch (error) {
        console.log(error);
        if (!isMounted) return;
        setRequests([]);
        setRooms([]);
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    void load();

    const refreshRequests = () => {
      if (!isMounted) {
        return;
      }

      void load();
    };

    window.addEventListener("ktx-registrations-updated", refreshRequests);
    window.addEventListener("ktx-rooms-updated", refreshRequests);
    window.addEventListener("focus", refreshRequests);

    return () => {
      isMounted = false;
      window.removeEventListener("ktx-registrations-updated", refreshRequests);
      window.removeEventListener("ktx-rooms-updated", refreshRequests);
      window.removeEventListener("focus", refreshRequests);
    };
  }, []);

  const roomNameById = useMemo(() => {
    const map = new Map<number, string>();
    rooms.forEach((room) => map.set(room.id, getRoomName(room)));
    return map;
  }, [rooms]);

  const bedLabelById = useMemo(() => {
    const map = new Map<number, string>();
    rooms.forEach((room) => {
      room.beds?.forEach((bed) => {
        map.set(bed.id, `#${bed.bed_number}`);
      });
    });
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

  const handleScrollToTop = () => {
    const scrollContainer = document.querySelector(".auth-scrollbar") as HTMLElement | null;

    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

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
    if (!isGenderFilterOpen) {
      return;
    }

    const updateMenuPosition = () => {
      const buttonRect = genderFilterButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) {
        return;
      }

      setGenderFilterMenuPosition({
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
  }, [isGenderFilterOpen]);

  const handleOpenFilter = () => {
    setDraftSelectionFilter(selectionFilter);
    setDraftSortOrder(sortOrder);
    setIsGenderFilterOpen(false);
    setIsFilterOpen(true);
  };

  const handleOpenGenderFilter = () => {
    setDraftGenderFilter(genderFilter);
    setIsFilterOpen(false);
    setIsGenderFilterOpen(true);
  };

  const handleResetFilter = () => {
    setDraftSelectionFilter("all");
    setDraftSortOrder("desc");
  };

  const handleApplyFilter = () => {
    setSelectionFilter(draftSelectionFilter);
    setSortOrder(draftSortOrder);
    setIsFilterOpen(false);
  };

  const handleResetGenderFilter = () => {
    setDraftGenderFilter("all");
  };

  const handleApplyGenderFilter = () => {
    setGenderFilter(draftGenderFilter);
    setIsGenderFilterOpen(false);
  };

  const visibleStudents = useMemo(() => {
    const normalized = headerSearchValue.trim().toLowerCase();

    const filtered = latestRequests
      .filter((request) => request.status === "approved")
      .filter((request) => Boolean(request.assigned_room_id))
      .filter((request) => {
        const matchesKeyword =
          !normalized ||
          [request.formData.mssv, request.formData.fullName]
            .join(" ")
            .toLowerCase()
            .includes(normalized);

        if (!matchesKeyword) {
          return false;
        }

        if (genderFilter !== "all" && getGenderFilterValue(request.formData.gender) !== genderFilter) {
          return false;
        }

        if (selectionFilter === "selected") {
          return Boolean(request.bedId);
        }

        if (selectionFilter === "not_selected") {
          return !request.bedId;
        }

        return true;
      });

    return filtered.sort((a, b) => {
      return sortOrder === "asc" ? a.id - b.id : b.id - a.id;
    });
  }, [genderFilter, headerSearchValue, latestRequests, selectionFilter, sortOrder]);

  const roomAssignedRequests = useMemo(() => {
    return latestRequests
      .filter((request) => request.status === "approved")
      .filter((request) => Boolean(request.assigned_room_id));
  }, [latestRequests]);

  const selectedCount = roomAssignedRequests.filter((request) => Boolean(request.bedId)).length;
  const notSelectedCount = roomAssignedRequests.filter((request) => !request.bedId).length;

  const summaryCards = [
    {
      label: "Đã chọn",
      value: selectedCount,
      valueClassName: "text-[#16784b]",
    },
    {
      label: "Chưa chọn",
      value: notSelectedCount,
      valueClassName: "text-[#9b6b00]",
    },
  ];

  if (isInitialLoading) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex min-h-[calc(100vh-8rem)] flex-col gap-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
          <h1 className="text-[28px] font-bold tracking-tight text-[#1a2d52]">Quản lý giường</h1>
          <p className="mt-1 text-sm text-[#62789f]">
            Đang tải danh sách sinh viên đã được phân phòng và trạng thái chọn giường.
          </p>
        </div>

        <div className="rounded-[20px] border border-[#d8e4f5] bg-white px-6 py-10 text-center">
          <div className="text-sm text-[#62789f]">Đang tải dữ liệu, vui lòng chờ...</div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex min-h-[calc(100vh-8rem)] flex-col gap-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <h1 className="text-[28px] font-bold tracking-tight text-[#1a2d52]">Quản lý giường</h1>
        <p className="mt-1 text-sm text-[#62789f]">
          Danh sách sinh viên đã được phân phòng và trạng thái chọn giường.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {summaryCards.map((card) => (
          <motion.article
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, ease: "easeOut" }}
            className="flex flex-col items-center rounded-[24px] border border-[#d8e4f5] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-5 py-4 text-center shadow-[0_14px_30px_rgba(36,76,184,0.08)]"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7c8fb5]">
              {card.label}
            </p>
            <p className={`mt-3 text-[2rem] font-extrabold leading-none ${card.valueClassName}`}>
              {card.value}
            </p>
          </motion.article>
        ))}
      </div>

      <div className="relative mt-1 min-h-[360px] flex-1 overflow-x-auto rounded-[14px] border border-[#d6e2f1] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <table className="w-full table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-[14%]" />
            <col className="w-[22%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[22%]" />
          </colgroup>
          <thead>
            <tr className="bg-[linear-gradient(180deg,#f7fbff_0%,#edf4ff_100%)]">
              <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                MSSV
              </th>
              <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                Họ tên
              </th>
              <th className="relative z-40 px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                <div className="inline-flex items-center justify-center gap-2">
                  <span>Giới tính</span>
                  <button
                    ref={genderFilterButtonRef}
                    type="button"
                    onClick={
                      isGenderFilterOpen ? () => setIsGenderFilterOpen(false) : handleOpenGenderFilter
                    }
                    className={`flex items-center justify-center transition ${genderFilter !== "all"
                      ? "text-[#244cb8]"
                      : "text-[#6f84ad] hover:text-[#244cb8]"
                      }`}
                    aria-label="Bật lọc giới tính"
                    title="Bật lọc giới tính"
                  >
                    <Funnel className="h-3.5 w-3.5" />
                  </button>
                </div>
              </th>
              <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                Phòng
              </th>
              <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                Giường
              </th>
              <th className="relative z-40 px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                <div className="inline-flex items-center justify-center gap-2">
                  <span>Trạng thái</span>
                  <button
                    ref={filterButtonRef}
                    type="button"
                    onClick={
                      isFilterOpen ? () => setIsFilterOpen(false) : handleOpenFilter
                    }
                    className={`flex items-center justify-center transition ${selectionFilter !== "all"
                      ? "text-[#244cb8]"
                      : "text-[#6f84ad] hover:text-[#244cb8]"
                      }`}
                    aria-label="Bật lọc và sắp xếp"
                    title="Bật lọc và sắp xếp"
                  >
                    <Funnel className="h-3.5 w-3.5" />
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleStudents.length > 0 ? (
              visibleStudents.map((request) => {
                const roomName = request.assigned_room_id
                  ? roomNameById.get(request.assigned_room_id) ?? "-"
                  : "-";
                const bedLabel = request.bedId
                  ? bedLabelById.get(request.bedId) ?? "Đang tải..."
                  : "Chưa chọn";
                const meta = getSelectionMeta(request);
                const StatusIcon = meta.Icon;

                return (
                  <tr key={request.id} className="transition duration-200 hover:bg-[#f8fbff]">
                    <td className="border-t border-[#e8eef8] px-4 py-4 text-center text-[15px] font-semibold text-[#24407f]">
                      {request.formData.mssv}
                    </td>
                    <td className="border-t border-[#e8eef8] px-4 py-4 text-center text-sm font-semibold text-[#1f3152]">
                      {request.formData.fullName}
                    </td>
                    <td className="border-t border-[#e8eef8] px-4 py-4 text-center text-sm font-semibold text-[#5d7299]">
                      {getGenderLabel(request.formData.gender)}
                    </td>
                    <td className="border-t border-[#e8eef8] px-4 py-4 text-center text-sm font-semibold text-[#6d7fa6]">
                      {roomName}
                    </td>
                    <td className="border-t border-[#e8eef8] px-4 py-4 text-center text-sm font-semibold text-[#5a6f98]">
                      {bedLabel}
                    </td>
                    <td className="border-t border-[#e8eef8] px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap ${meta.badgeClassName}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="border-t border-[#e8eef8] px-4 py-14 text-center text-sm font-semibold text-[#5c7094]">
                  Không có dữ liệu phù hợp với bộ lọc/từ khóa tìm kiếm.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isGenderFilterOpen && genderFilterMenuPosition
        ? createPortal(
          <div className="fixed inset-0 z-[68]" onClick={() => setIsGenderFilterOpen(false)}>
            <div
              className="absolute w-[170px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
              style={{ top: genderFilterMenuPosition.top, left: genderFilterMenuPosition.left }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="space-y-0.5 p-2.5">
                {genderFilterOptions.map((option) => {
                  const isSelected = draftGenderFilter === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDraftGenderFilter(option.value)}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${isSelected
                          ? "border-[#244cb8] bg-[#244cb8]/10"
                          : "border-[#cfd9e8] bg-white"
                          }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${isSelected ? "bg-[#244cb8]" : "bg-transparent"
                            }`}
                        />
                      </span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-[#dbe5f3] px-2.5 py-2">
                <button
                  type="button"
                  onClick={handleResetGenderFilter}
                  className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleApplyGenderFilter}
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

      {isFilterOpen && filterMenuPosition
        ? createPortal(
          <div className="fixed inset-0 z-[68]" onClick={() => setIsFilterOpen(false)}>
            <div
              className="absolute w-[210px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
              style={{ top: filterMenuPosition.top, left: filterMenuPosition.left }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="space-y-0.5 p-2.5">
                {filterOptions.map((option) => {
                  const isSelected = draftSelectionFilter === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDraftSelectionFilter(option.value)}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${isSelected
                          ? "border-[#244cb8] bg-[#244cb8]/10"
                          : "border-[#cfd9e8] bg-white"
                          }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${isSelected ? "bg-[#244cb8]" : "bg-transparent"
                            }`}
                        />
                      </span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}

                <div className="mt-2 border-t border-[#dbe5f3] pt-2">
                  <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7a8eb6]">
                    Sắp xếp ID
                  </p>
                  {idSortOptions.map((option) => {
                    const isSelected = draftSortOrder === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDraftSortOrder(option.value)}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border ${isSelected
                            ? "border-[#244cb8] bg-[#244cb8]/10"
                            : "border-[#cfd9e8] bg-white"
                            }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${isSelected ? "bg-[#244cb8]" : "bg-transparent"
                              }`}
                          />
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

      {isScrollToTopVisible
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
    </motion.section>
  );
}

