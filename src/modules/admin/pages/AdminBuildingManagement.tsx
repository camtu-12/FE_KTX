import { useEffect, useMemo, useRef, useState, type FormEvent, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { motion } from "framer-motion";
import {
  ArrowUp,
  Eye,
  Funnel,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import { initialBuildings, type Building, type BuildingStatus } from "../../../mocks/buildings";

const STORAGE_KEY = "ktx_buildings_dashboard_v2";

type BuildingForm = {
  building_code: string;
  address: string;
  total_floors: number;
  status: BuildingStatus;
};

function InputField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10 ${props.className ?? ""}`} />;
}

function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10 ${props.className ?? ""}`} />;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-[24px] border border-[#d8e4f5] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-5 py-4 shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#7c8fb5]">{label}</p>
      <p className="mt-2 text-2xl font-extrabold leading-none text-[#1a2d52]">{value}</p>
    </article>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  children,
  footer,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[30px] border border-white/60 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-[#1a2d52]">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-[#bfd2ec] hover:bg-[#f3f8ff] hover:text-[#244cb8]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-84px)] overflow-y-auto px-6 py-6">{children}</div>
        {footer ? <div className="border-t border-slate-200 px-6 py-5">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

function getBuildingMetrics(building: Building) {
  return building.floors.reduce(
    (accumulator, floor) => {
      accumulator.rooms += floor.roomCount;
      accumulator.beds += floor.bedCount;
      accumulator.students += floor.occupiedStudents;
      return accumulator;
    },
    { rooms: 0, beds: 0, students: 0 },
  );
}

function getBuildingStatusLabel(status: BuildingStatus) {
  if (status === "ACTIVE") return "Đang hoạt động";
  if (status === "MAINTENANCE") return "Bảo trì";
  return "Ngừng hoạt động";
}

function getBuildingStatusClass(status: BuildingStatus) {
  if (status === "ACTIVE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "MAINTENANCE") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function createEmptyBuildingForm(): BuildingForm {
  return {
    building_code: "",
    address: "",
    total_floors: 1,
    status: "ACTIVE",
  };
}

export default function AdminBuildingManagement() {
  const navigate = useNavigate();
  const { headerSearchValue } = useOutletContext<AdminLayoutOutletContext>();

  const [buildings, setBuildings] = useState<Building[]>(() => {
    if (typeof window === "undefined") return initialBuildings;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return initialBuildings;
      const parsed = JSON.parse(raw) as Building[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialBuildings;
    } catch {
      return initialBuildings;
    }
  });

  const [isScrollToTopVisible, setIsScrollToTopVisible] = useState(false);
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [editingBuildingId, setEditingBuildingId] = useState<number | null>(null);
  const [buildingForm, setBuildingForm] = useState<BuildingForm>(createEmptyBuildingForm());
  const [buildingFormError, setBuildingFormError] = useState("");
  const [buildingValidationErrors, setBuildingValidationErrors] = useState<{ building_code?: string; address?: string }>({});
  const [buildingSubmitAttempted, setBuildingSubmitAttempted] = useState(false);

  const [filterStatus, setFilterStatus] = useState<BuildingStatus | "all">("all");
  const [filterBuilding, setFilterBuilding] = useState<string>("all");
  const [idSortOrder, setIdSortOrder] = useState<"asc" | "desc">("asc");

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const [draftFilterStatus, setDraftFilterStatus] = useState<BuildingStatus | "all">("all");
  const [draftFilterBuilding, setDraftFilterBuilding] = useState<string>("all");
  const [draftIdSortOrder, setDraftIdSortOrder] = useState<"asc" | "desc">("asc");

  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isBuildingFilterOpen, setIsBuildingFilterOpen] = useState(false);
  const [statusFilterMenuPosition, setStatusFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [buildingFilterMenuPosition, setBuildingFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const statusFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const buildingFilterButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onScroll = () => setIsScrollToTopVisible(window.scrollY > 240);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildings));
  }, [buildings]);

  useEffect(() => {
    if (!isStatusFilterOpen) return;

    const updateMenuPosition = () => {
      const buttonRect = statusFilterButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;

      setStatusFilterMenuPosition({
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
  }, [isStatusFilterOpen]);

  useEffect(() => {
    if (!isBuildingFilterOpen) return;

    const updateMenuPosition = () => {
      const buttonRect = buildingFilterButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;

      setBuildingFilterMenuPosition({
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
  }, [isBuildingFilterOpen]);

  const buildingCodes = useMemo(() => Array.from(new Set(buildings.map((building) => building.building_code))).sort(), [buildings]);

  const filteredBuildings = useMemo(() => {
    const keyword = headerSearchValue.trim().toLowerCase();

    return [...buildings]
      .filter((building) => {
        const metrics = getBuildingMetrics(building);
        const haystack = [
          building.building_code,
          `Tòa ${building.building_code}`,
          building.address ?? "",
          String(building.total_floors),
          String(metrics.rooms),
          String(metrics.beds),
          String(metrics.students),
        ]
          .join(" ")
          .toLowerCase();

        const matchesKeyword = keyword ? haystack.includes(keyword) : true;
        const matchesStatus = filterStatus === "all" ? true : building.status === filterStatus;
        const matchesBuilding = filterBuilding === "all" ? true : building.building_code === filterBuilding;

        return matchesKeyword && matchesStatus && matchesBuilding;
      })
      .sort((left, right) => (idSortOrder === "asc" ? left.id - right.id : right.id - left.id));
  }, [buildings, filterBuilding, filterStatus, headerSearchValue, idSortOrder]);

  const filteredTotals = useMemo(() => {
    return filteredBuildings.reduce(
      (accumulator, building) => {
        const metrics = getBuildingMetrics(building);
        accumulator.buildings += 1;
        accumulator.floors += building.total_floors;
        accumulator.rooms += metrics.rooms;
        accumulator.beds += metrics.beds;
        accumulator.students += metrics.students;
        return accumulator;
      },
      { buildings: 0, floors: 0, rooms: 0, beds: 0, students: 0 },
    );
  }, [filteredBuildings]);

  const editingBuilding = useMemo(() => {
    if (!editingBuildingId) return null;
    return buildings.find((building) => building.id === editingBuildingId) ?? null;
  }, [buildings, editingBuildingId]);

  const editingBuildingMetrics = editingBuilding ? getBuildingMetrics(editingBuilding) : { rooms: 0, beds: 0, students: 0 };
  const formOccupiedStudents = editingBuildingId ? editingBuildingMetrics.students : 0;
  const isEditingFromMaintenance = editingBuilding?.status === "MAINTENANCE";

  const isMaintenanceBlocked = Boolean(editingBuildingId) && !isEditingFromMaintenance && buildingForm.status === "MAINTENANCE" && formOccupiedStudents > 0;
  const isInactiveBlocked = Boolean(editingBuildingId) && !isEditingFromMaintenance && buildingForm.status === "INACTIVE" && formOccupiedStudents > 0;
  const isBuildingStatusBlocked = Boolean(isMaintenanceBlocked || isInactiveBlocked);

  const blockedBuildingStatusMessage = useMemo(() => {
    if (isMaintenanceBlocked) {
      return `Tòa đang có ${formOccupiedStudents} sinh viên ở. Cần di dời trước khi chuyển sang BẢO TRÌ.`;
    }

    if (isInactiveBlocked) {
      return `Tòa đang có ${formOccupiedStudents} sinh viên ở nên không thể chuyển sang NGỪNG HOẠT ĐỘNG. Hãy di dời sinh viên đi trước.`;
    }

    return "";
  }, [formOccupiedStudents, isInactiveBlocked, isMaintenanceBlocked]);

  const openAddBuilding = () => {
    setEditingBuildingId(null);
    setBuildingForm(createEmptyBuildingForm());
    setBuildingFormError("");
    setBuildingValidationErrors({});
    setBuildingSubmitAttempted(false);
    setIsBuildingModalOpen(true);
  };

  const openEditBuilding = (building: Building) => {
    setEditingBuildingId(building.id);
    setBuildingForm({
      building_code: building.building_code,
      address: building.address ?? "",
      total_floors: building.total_floors,
      status: building.status,
    });
    setBuildingFormError("");
    setIsBuildingModalOpen(true);
  };

  const saveBuilding = (event: FormEvent) => {
    event.preventDefault();
    setBuildingSubmitAttempted(true);

    const nextForm: BuildingForm = {
      building_code: buildingForm.building_code.trim().toUpperCase(),
      address: buildingForm.address.trim(),
      total_floors: Math.max(1, Math.round(Number(buildingForm.total_floors) || 1)),
      status: buildingForm.status,
    };
    const errors: { building_code?: string; address?: string } = {};
    if (!nextForm.building_code) errors.building_code = "Vui lòng nhập Mã tòa";
    if (!nextForm.address) errors.address = "Vui lòng nhập Địa chỉ";
    if (Object.keys(errors).length > 0) {
      setBuildingValidationErrors(errors);
      return;
    }

    // Prevent duplicate building code or address
    const normalizedCode = nextForm.building_code.trim().toUpperCase();
    const normalizedAddress = nextForm.address.trim();
    const codeExists = buildings.some((b) => b.building_code.trim().toUpperCase() === normalizedCode && (editingBuildingId ? b.id !== editingBuildingId : true));
    if (codeExists) {
      setBuildingValidationErrors({ building_code: "Mã tòa đã tồn tại" });
      return;
    }

    if (normalizedAddress) {
      const addrExists = buildings.some((b) => (b.address ?? '').trim().toLowerCase() === normalizedAddress.toLowerCase() && (editingBuildingId ? b.id !== editingBuildingId : true));
      if (addrExists) {
        setBuildingValidationErrors({ address: "Địa chỉ tòa đã tồn tại" });
        return;
      }
    }

    if (editingBuildingId !== null && !isEditingFromMaintenance) {
      if (nextForm.status === "MAINTENANCE" && formOccupiedStudents > 0) {
        setBuildingFormError(`Tòa đang có ${formOccupiedStudents} sinh viên ở. Cần di dời trước khi chuyển sang BẢO TRÌ.`);
        return;
      }

      if (nextForm.status === "INACTIVE" && formOccupiedStudents > 0) {
        setBuildingFormError(`Tòa đang có ${formOccupiedStudents} sinh viên ở nên không thể chuyển sang NGỪNG HOẠT ĐỘNG. Hãy di dời sinh viên đi trước.`);
        return;
      }

      // Allow switching to ACTIVE (Ngừng hoạt động -> Đang hoạt động) even if there are currently 0 students.
    }

    if (editingBuildingId === null) {
      const nextId = buildings.length > 0 ? Math.max(...buildings.map((building) => building.id)) + 1 : 1;
      setBuildings((current) => [
        {
          id: nextId,
          building_code: nextForm.building_code,
          address: nextForm.address || undefined,
          total_floors: nextForm.total_floors,
          status: nextForm.status,
          floors: [],
        },
        ...current,
      ]);
    } else {
      setBuildings((current) =>
        current.map((building) =>
          building.id === editingBuildingId
            ? {
                ...building,
                building_code: nextForm.building_code,
                address: nextForm.address || undefined,
                total_floors: nextForm.total_floors,
                status: nextForm.status,
              }
            : building,
        ),
      );
    }

    setIsBuildingModalOpen(false);
  };

  function showConfirm(message: string, action: () => void) {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setIsConfirmOpen(true);
  }

  function closeConfirm() {
    setIsConfirmOpen(false);
    setConfirmMessage("");
    setConfirmAction(null);
  }

  function confirmNow() {
    if (confirmAction) confirmAction();
    closeConfirm();
  }

  const removeBuilding = (building: Building) => {
    const metrics = getBuildingMetrics(building);
    if (metrics.students > 0) {
      showConfirm(
        `Không thể xóa tòa ${building.building_code} vì đang có ${metrics.students} sinh viên ở. Hãy chuyển sinh viên sang tòa khác trước.`,
        () => {},
      );
      return;
    }

    showConfirm(`Bạn có chắc muốn xóa tòa ${building.building_code} không?`, () => {
      setBuildings((current) => current.filter((item) => item.id !== building.id));
    });
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenStatusFilter = () => {
    setDraftFilterStatus(filterStatus);
    setDraftIdSortOrder(idSortOrder);
    setIsStatusFilterOpen(true);
  };

  const handleResetStatusFilter = () => {
    setDraftFilterStatus("all");
    setDraftIdSortOrder("asc");
    setFilterStatus("all");
    setIdSortOrder("asc");
    setIsStatusFilterOpen(false);
  };

  const handleApplyStatusFilter = () => {
    setFilterStatus(draftFilterStatus);
    setIdSortOrder(draftIdSortOrder);
    setIsStatusFilterOpen(false);
  };

  const handleOpenBuildingFilter = () => {
    setDraftFilterBuilding(filterBuilding);
    setIsBuildingFilterOpen(true);
  };

  const handleResetBuildingFilter = () => {
    setDraftFilterBuilding("all");
    setFilterBuilding("all");
    setIsBuildingFilterOpen(false);
  };

  const handleApplyBuildingFilter = () => {
    setFilterBuilding(draftFilterBuilding);
    setIsBuildingFilterOpen(false);
  };

  const statCards = [
    { label: "Tổng tòa", value: filteredTotals.buildings },
    { label: "Tổng tầng", value: filteredTotals.floors },
    { label: "Tổng phòng", value: filteredTotals.rooms },
    { label: "Tổng giường", value: filteredTotals.beds },
    { label: "Tổng sinh viên đang ở", value: filteredTotals.students },
  ] as const;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex min-h-full flex-col gap-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
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

      {isConfirmOpen
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 sm:items-center">
              <div className="absolute inset-0 bg-black/30" onClick={closeConfirm} />
              <div className="relative w-full max-w-3xl rounded-[26px] bg-white p-7 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
                <p className="text-lg font-semibold text-[#1a2d52]">{confirmMessage}</p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeConfirm}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmNow}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-900"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isStatusFilterOpen && statusFilterMenuPosition
        ? createPortal(
            <div className="fixed inset-0 z-[68]" onClick={() => setIsStatusFilterOpen(false)}>
              <div
                className="absolute w-[210px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
                style={{ top: statusFilterMenuPosition.top, left: statusFilterMenuPosition.left }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-0.5 p-2.5">
                  {[
                    { value: "all", label: "Tất cả" },
                    { value: "ACTIVE", label: "Đang hoạt động" },
                    { value: "MAINTENANCE", label: "Bảo trì" },
                    { value: "INACTIVE", label: "Ngừng hoạt động" },
                  ].map((option) => {
                    const selected = draftFilterStatus === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDraftFilterStatus(option.value as BuildingStatus | "all")}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected ? "border-[#244cb8] bg-[#244cb8]/10" : "border-[#cfd9e8] bg-white"}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${selected ? "bg-[#244cb8]" : "bg-transparent"}`} />
                        </span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                  <div className="mt-2 border-t border-[#dbe5f3] pt-2">
                    <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7a8eb6]">Sắp xếp ID</p>
                    {[
                      { value: "desc", label: "Mới nhất trước" },
                      { value: "asc", label: "Cũ nhất trước" },
                    ].map((option) => {
                      const selected = draftIdSortOrder === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setDraftIdSortOrder(option.value as "asc" | "desc")}
                          className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected ? "border-[#244cb8] bg-[#244cb8]/10" : "border-[#cfd9e8] bg-white"}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${selected ? "bg-[#244cb8]" : "bg-transparent"}`} />
                          </span>
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-[#dbe5f3] px-2.5 py-2">
                  <button type="button" onClick={handleResetStatusFilter} className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]">
                    Reset
                  </button>
                  <button type="button" onClick={handleApplyStatusFilter} className="rounded-xl bg-[#0c4f97] px-3 py-1.5 text-[10px] font-semibold tracking-normal text-white shadow-[0_8px_16px_rgba(12,79,151,0.22)] transition hover:brightness-110">
                    OK
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isBuildingFilterOpen && buildingFilterMenuPosition
        ? createPortal(
            <div className="fixed inset-0 z-[68]" onClick={() => setIsBuildingFilterOpen(false)}>
              <div
                className="absolute w-[210px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
                style={{ top: buildingFilterMenuPosition.top, left: buildingFilterMenuPosition.left }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-0.5 p-2.5">
                  {[{ value: "all", label: "Tất cả" }, ...buildingCodes.map((code) => ({ value: code, label: `Tòa ${code}` }))].map((option) => {
                    const selected = draftFilterBuilding === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDraftFilterBuilding(option.value)}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected ? "border-[#244cb8] bg-[#244cb8]/10" : "border-[#cfd9e8] bg-white"}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${selected ? "bg-[#244cb8]" : "bg-transparent"}`} />
                        </span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between border-t border-[#dbe5f3] px-2.5 py-2">
                  <button type="button" onClick={handleResetBuildingFilter} className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]">
                    Reset
                  </button>
                  <button type="button" onClick={handleApplyBuildingFilter} className="rounded-xl bg-[#0c4f97] px-3 py-1.5 text-[10px] font-semibold tracking-normal text-white shadow-[0_8px_16px_rgba(12,79,151,0.22)] transition hover:brightness-110">
                    OK
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <>
        <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-[#1a2d52]">Quản lý tòa</h1>
              <p className="mt-1 text-sm text-[#62789f]">Quản lý tòa, tầng và trạng thái cấu hình trong ký túc xá.</p>
            </div>

              <button
                type="button"
                onClick={openAddBuilding}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(36,76,184,0.28)] transition hover:-translate-y-0.5 hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                Thêm tòa nhà
              </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <SelectField value={filterBuilding} onChange={(event) => setFilterBuilding(event.target.value)}>
              <option value="all">Tất cả tòa</option>
              {buildingCodes.map((buildingCode) => (
                <option key={buildingCode} value={buildingCode}>
                  Tòa {buildingCode}
                </option>
              ))}
            </SelectField>

            <SelectField value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as BuildingStatus | "all")}>
              <option value="all">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="MAINTENANCE">Bảo trì</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
            </SelectField>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} />
          ))}
        </div>

        <div className="overflow-hidden rounded-[32px] border border-[#d7e2f0] bg-white shadow-[0_18px_40px_rgba(36,76,184,0.08)]">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[22%]" />
                <col className="w-[10%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
                <col className="w-[9%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                  <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                    <div className="inline-flex items-center justify-center gap-2">
                      <span>Tòa</span>
                      <button
                        ref={buildingFilterButtonRef}
                        type="button"
                        onClick={isBuildingFilterOpen ? () => setIsBuildingFilterOpen(false) : handleOpenBuildingFilter}
                        className={`flex items-center justify-center transition ${filterBuilding !== "all" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"}`}
                        aria-label="Bộ lọc tòa"
                        title="Bộ lọc tòa"
                      >
                        <Funnel className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </th>
                  <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Địa chỉ</th>
                  <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Tổng tầng</th>
                  <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Tổng phòng</th>
                  <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Tổng giường</th>
                  <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Sinh viên</th>
                  <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                    <div className="inline-flex items-center justify-center gap-2">
                      <span>Trạng thái</span>
                      <button
                        ref={statusFilterButtonRef}
                        type="button"
                        onClick={isStatusFilterOpen ? () => setIsStatusFilterOpen(false) : handleOpenStatusFilter}
                        className={`flex items-center justify-center transition ${filterStatus !== "all" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"}`}
                        aria-label="Bộ lọc trạng thái"
                        title="Bộ lọc trạng thái"
                      >
                        <Funnel className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </th>
                  <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuildings.length > 0 ? (
                  filteredBuildings.map((building) => {
                    const metrics = getBuildingMetrics(building);

                    return (
                      <tr key={building.id} className="group transition-colors duration-200 hover:bg-[#f8fbff]">
                        <td className="border-t border-[#e7eef9] px-3 py-4 text-center text-sm font-semibold text-[#1f3152]">Tòa {building.building_code}</td>
                        <td className="border-t border-[#e7eef9] px-3 py-4 text-center text-sm text-[#5d7299]">{building.address ?? "-"}</td>
                        <td className="border-t border-[#e7eef9] px-3 py-4 text-center text-sm text-[#5d7299]">{building.total_floors}</td>
                        <td className="border-t border-[#e7eef9] px-3 py-4 text-center text-sm text-[#5d7299]">{metrics.rooms}</td>
                        <td className="border-t border-[#e7eef9] px-3 py-4 text-center text-sm text-[#5d7299]">{metrics.beds}</td>
                        <td className="border-t border-[#e7eef9] px-3 py-4 text-center text-sm text-[#5d7299]">{metrics.students}</td>
                        <td className="border-t border-[#e7eef9] px-3 py-4 text-center">
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getBuildingStatusClass(building.status)}`}>
                            {getBuildingStatusLabel(building.status)}
                          </span>
                        </td>
                        <td className="border-t border-[#e7eef9] px-3 py-4 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="flex items-center justify-center gap-2">
                              <button type="button" onClick={() => navigate(`/admin/buildings/${building.id}`)} aria-label="Xem chi tiết" title="Xem chi tiết" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white">
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" onClick={() => openEditBuilding(building)} aria-label="Sửa" title="Sửa" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <button type="button" onClick={() => removeBuilding(building)} aria-label="Xóa" title="Xóa" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 shadow-[0_8px_18px_rgba(225,85,105,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="border-t border-[#e7eef9] px-4 py-14 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-[28px] border border-dashed border-[#cfdcf0] bg-[#f8fbff] px-6 py-10 text-center">
                        <p className="mt-3 text-sm font-semibold text-[#1a2d52]">Không tìm thấy tầng phù hợp với bộ lọc hiện tại</p>
                        <button type="button" onClick={() => { setFilterStatus("all"); setFilterBuilding("all"); }} className="mt-4 inline-flex h-8 items-center justify-center rounded-xl bg-[#244cb8] px-3.5 text-sm font-semibold text-white transition hover:bg-[#1f44a4]">
                          Bỏ bộ lọc
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>

      {isBuildingModalOpen ? (
        <ModalShell
          title={editingBuildingId === null ? "Thêm tòa mới" : "Chỉnh sửa tòa"}
          description="Cập nhật thông tin cơ bản của tòa nhà"
          onClose={() => setIsBuildingModalOpen(false)}
          footer={
            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => setIsBuildingModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                Hủy
              </button>
              <button
                type="submit"
                form="building-form"
                disabled={isBuildingStatusBlocked}
                title={isBuildingStatusBlocked ? blockedBuildingStatusMessage : undefined}
                className="rounded-xl bg-[#244cb8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f44a4] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#244cb8]"
              >
                Lưu
              </button>
            </div>
          }
        >
          <form id="building-form" onSubmit={saveBuilding} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#1a2d52]">Mã tòa <span className="ml-1 text-red-500">*</span></label>
              <InputField value={buildingForm.building_code} onChange={(event) => { setBuildingForm((current) => ({ ...current, building_code: event.target.value.toUpperCase() })); setBuildingValidationErrors({}); }} placeholder="A" />
              {buildingSubmitAttempted && buildingValidationErrors.building_code ? (
                <div className="mt-1 text-xs text-red-600">{buildingValidationErrors.building_code}</div>
              ) : null}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#1a2d52]">Trạng thái <span className="ml-1 text-red-500">*</span></label>
              <SelectField value={buildingForm.status} onChange={(event) => { setBuildingForm((current) => ({ ...current, status: event.target.value as BuildingStatus })); setBuildingValidationErrors({}); setBuildingFormError(""); }}>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="MAINTENANCE">Bảo trì</option>
                <option value="INACTIVE">Ngừng hoạt động</option>
              </SelectField>
              {isBuildingStatusBlocked ? (
                <p className="mt-2 text-xs font-medium text-amber-700">{blockedBuildingStatusMessage}</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-[#1a2d52]">Địa chỉ <span className="ml-1 text-red-500">*</span></label>
              <InputField value={buildingForm.address} onChange={(event) => { setBuildingForm((current) => ({ ...current, address: event.target.value })); setBuildingValidationErrors({}); }} placeholder="180 Cao Lỗ, Quận 8, TP.HCM" />
              {buildingSubmitAttempted && buildingValidationErrors.address ? (
                <div className="mt-1 text-xs text-red-600">{buildingValidationErrors.address}</div>
              ) : null}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#1a2d52]">Số tầng <span className="ml-1 text-red-500">*</span></label>
              <InputField type="number" min={1} value={buildingForm.total_floors} onChange={(event) => { setBuildingForm((current) => ({ ...current, total_floors: Number(event.target.value) })); setBuildingValidationErrors({}); }} />
            </div>
          </form>
          {buildingFormError ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {buildingFormError}
            </p>
          ) : null}
        </ModalShell>
      ) : null}
    </motion.section>
  );
}

