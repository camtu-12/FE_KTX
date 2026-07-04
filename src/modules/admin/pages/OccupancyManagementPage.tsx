import { motion } from "framer-motion";
import { CheckCircle2, CircleAlert, Clock3, Funnel, ShieldAlert, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import { type Occupancy, type OccupancyStatus } from "../../../mocks/occupancies";
import type { Student, StudentGender } from "../../../mocks/students";
import {
  confirmCheckoutForRegistration,
  forceCheckoutForRegistration,
  getRegistrations,
  getRooms,
} from "../../../api/registrationService";
import type { RegistrationRequest } from "../data/registrationRequests";
import type { DormRoom } from "../../../types/dormRoom";
import { listViolationTypes, type ActivityCategory, type ViolationType } from "../../../api/violationTypeApi";
import { createViolation } from "../../../api/violationApi";
import { formatDate } from "../../../utils/dateFormat";
import { fetchOccupancyDetail, type OccupancyDetail } from "../../../api/occupancyDetailApi";
import { searchStudentsForOccupancy } from "../../../api/studentSearchApi";
import FaceSearchModal from "../components/FaceSearchModal";

type OccupancyStatusFilter = OccupancyStatus | "ALL";

const statusMeta: Record<
  OccupancyStatus,
  {
    label: string;
    badgeClassName: string;
    Icon: typeof CheckCircle2;
  }
> = {
  ACTIVE: {
    label: "Đang lưu trú",
    badgeClassName: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    Icon: CheckCircle2,
  },
  CHECKOUT_REQUESTED: {
    label: "Yêu cầu thôi ở",
    badgeClassName: "border border-amber-200 bg-amber-50 text-amber-700",
    Icon: Clock3,
  },
  CHECKED_OUT: {
    label: "Đã thôi ở",
    badgeClassName: "border border-slate-200 bg-slate-50 text-slate-600",
    Icon: CheckCircle2,
  },
  FORCED_CHECKOUT: {
    label: "Buộc thôi ở",
    badgeClassName: "border border-rose-200 bg-rose-50 text-rose-700",
    Icon: CircleAlert,
  },
};

const statusOptions: Array<{ value: OccupancyStatusFilter; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "ACTIVE", label: "Đang lưu trú" },
  { value: "CHECKOUT_REQUESTED", label: "Yêu cầu thôi ở" },
  { value: "CHECKED_OUT", label: "Đã thôi ở" },
  { value: "FORCED_CHECKOUT", label: "Buộc thôi ở" },
];

const getStatusMeta = (status: Occupancy["status"]) => statusMeta[status] ?? statusMeta.ACTIVE;
const canAddViolation = (occupancy: Occupancy | null | undefined) =>
  occupancy?.status === "ACTIVE" || occupancy?.status === "CHECKOUT_REQUESTED";

const uniqueSorted = <T extends string | number>(items: T[]) => {
  return Array.from(new Set(items)).sort((a, b) => String(a).localeCompare(String(b), "vi-VN", { numeric: true }));
};

const emptyValue = "-";

const levelMeta = {
  MINOR: {
    label: "Nhẹ",
    badgeClassName: "border border-yellow-200 bg-yellow-50 text-yellow-700",
  },
  MEDIUM: {
    label: "Trung bình",
    badgeClassName: "border border-orange-200 bg-orange-50 text-orange-700",
  },
  SERIOUS: {
    label: "Nghiêm trọng",
    badgeClassName: "border border-red-200 bg-red-50 text-red-700",
  },
};

const categoryMeta: Record<ActivityCategory, { label: string; badgeClassName: string }> = {
  positive: {
    label: "Hoạt động tích cực",
    badgeClassName: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  negative: {
    label: "Vi phạm",
    badgeClassName: "border border-rose-200 bg-rose-50 text-rose-700",
  },
};

const actionLabels = {
  reward_recorded: "Ghi nhận khen thưởng",
  reminded: "Nhắc nhở",
  warned: "Cảnh cáo",
  force_evicted: "Buộc thôi ở",
} as const;

type ActivityAction = keyof typeof actionLabels;

const getTodayValue = () => new Date().toISOString().slice(0, 10);

const getGenderLabel = (gender?: StudentGender) => {
  if (gender === "MALE") {
    return "Nam";
  }

  if (gender === "FEMALE") {
    return "Nữ";
  }

  return emptyValue;
};

const getStudentText = (student: Student | undefined, field: keyof Student) => {
  const value = student?.[field];

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return emptyValue;
};

const normalizeGender = (gender: string): StudentGender => {
  const normalized = gender.trim().toLowerCase();
  return normalized === "female" || normalized === "nữ" || normalized === "nu" ? "FEMALE" : "MALE";
};

const resolveRoomBedNumber = (room: DormRoom | undefined, bedId: number | null | undefined) => {
  if (!room || !bedId) {
    return "";
  }

  const bed = room.beds?.find((item) => item.id === bedId);
  return bed?.bed_number ? String(bed.bed_number) : "";
};

const resolveOccupancyStatus = (value: string | null | undefined): OccupancyStatus => {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "checkout_requested") {
    return "CHECKOUT_REQUESTED";
  }

  if (normalized === "checked_out") {
    return "CHECKED_OUT";
  }

  if (normalized === "forced_checkout" || normalized === "terminated") {
    return "FORCED_CHECKOUT";
  }

  return "ACTIVE";
};

const occupancyManagementStatuses = new Set([
  "active",
  "checkout_requested",
  "completed",
  "checked_out",
  "terminated",
  "forced_checkout",
]);

const isOccupancyManagementStatus = (value: string | null | undefined) =>
  occupancyManagementStatuses.has(String(value ?? "").trim().toLowerCase());

const createOccupancyRowsFromApi = (
  registrations: RegistrationRequest[],
  rooms: DormRoom[],
): { occupancies: Occupancy[]; students: Student[] } => {
  const studentsById: Student[] = [];
  const occupancies = registrations
    .filter((registration) => {
      return (
        registration.status === "approved" &&
        Boolean(registration.occupancy_id) &&
        Boolean(registration.assigned_room_id) &&
        Boolean(registration.bedId) &&
        isOccupancyManagementStatus(registration.occupancy_status)
      );
    })
    .map((registration) => {
      const room = rooms.find((item) => item.id === registration.assigned_room_id);
      const studentId = registration.id;
      const formData = registration.formData;

      studentsById.push({
        id: studentId,
        studentCode: formData.mssv,
        fullName: formData.fullName,
        gender: normalizeGender(formData.gender),
        dateOfBirth: formData.birthDate,
        className: formData.class,
        faculty: formData.department,
        phone: formData.phone,
        email: registration.email,
        currentYear: registration.current_year ?? null,
      });

      const occupancyStatus = resolveOccupancyStatus(registration.occupancy_status);

      return {
        id: registration.id,
        occupancyId: registration.occupancy_id ?? null,
        studentId,
        roomId: registration.assigned_room_id ?? 0,
        bedId: registration.bedId ?? 0,
        buildingCode: room?.building_code ?? "",
        floorNumber: room?.floor_number ?? room?.floor?.floor_number ?? 0,
        roomNumber: String(room?.room_number ?? ""),
        bedNumber: resolveRoomBedNumber(room, registration.bedId),
        checkInDate: registration.check_in_date || formData.dormStartDate || registration.submittedAt,
        checkOutDate: registration.check_out_date || undefined,
        status: occupancyStatus,
        leaveRequest: occupancyStatus === "CHECKOUT_REQUESTED"
          ? {
              requestedAt: "",
              expectedLeaveDate: registration.check_out_date || "",
              reason: registration.occupancy_reason || "",
            }
          : undefined,
        forcedCheckoutReason: occupancyStatus === "FORCED_CHECKOUT"
          ? (registration.occupancy_reason === "FORCE_EVICTED"
              ? (registration.blacklist?.reason || "Nợ quá hạn")
              : registration.occupancy_reason || "")
          : undefined,
      } satisfies Occupancy;
    });

  return { occupancies, students: studentsById };
};

export default function OccupancyManagementPage() {
  const { headerSearchValue, setNavAutocomplete, setOnOpenFaceSearch } = useOutletContext<AdminLayoutOutletContext>();
  const [isFaceSearchModalOpen, setIsFaceSearchModalOpen] = useState(false);
  const [occupancyRows, setOccupancyRows] = useState<Occupancy[]>([]);
  const [studentRows, setStudentRows] = useState<Student[]>([]);
  const [isLoadingOccupancies, setIsLoadingOccupancies] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("ALL");
  const [floorFilter, setFloorFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<OccupancyStatusFilter>("ALL");
  const [draftStatusFilter, setDraftStatusFilter] = useState<OccupancyStatusFilter>("ALL");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [statusFilterMenuPosition, setStatusFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const statusFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const [selectedOccupancy, setSelectedOccupancy] = useState<Occupancy | null>(null);
  const [forceCheckoutTarget, setForceCheckoutTarget] = useState<Occupancy | null>(null);
  const [forceCheckoutReason, setForceCheckoutReason] = useState("");
  const [forceCheckoutReasonError, setForceCheckoutReasonError] = useState("");
  const [violationTarget, setViolationTarget] = useState<Occupancy | null>(null);
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [violationTypeId, setViolationTypeId] = useState("");
  const [violationDate, setViolationDate] = useState(getTodayValue);
  const [violationNote, setViolationNote] = useState("");
  const [activityAction, setActivityAction] = useState<ActivityAction>("reminded");
  const [violationFormError, setViolationFormError] = useState("");
  const [isSavingViolation, setIsSavingViolation] = useState(false);
  const [occupancyDetail, setOccupancyDetail] = useState<OccupancyDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showAllRoomChanges, setShowAllRoomChanges] = useState(false);
  const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const occupancyRowsRef = useRef(occupancyRows);

  const studentById = useMemo(() => new Map(studentRows.map((student) => [student.id, student])), [studentRows]);
  const buildingOptions = useMemo(() => uniqueSorted(occupancyRows.map((item) => item.buildingCode)), [occupancyRows]);
  const floorOptions = useMemo(() => uniqueSorted(occupancyRows.map((item) => item.floorNumber)), [occupancyRows]);
  const visibleOccupancies = useMemo(() => {
    const normalizedSearch = headerSearchValue.trim().toLowerCase();

    return occupancyRows.filter((item) => {
      const matchesBuilding = buildingFilter === "ALL" || item.buildingCode === buildingFilter;
      const matchesFloor = floorFilter === "ALL" || String(item.floorNumber) === floorFilter;
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const student = studentById.get(item.studentId);
      const matchesGender = genderFilter === "ALL" || student?.gender === genderFilter;
      const matchesYear = yearFilter === "ALL" || String(student?.currentYear ?? "") === yearFilter;
      const matchesSearch =
        !normalizedSearch ||
        [student?.studentCode, student?.fullName, student?.email].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearch);

      return matchesBuilding && matchesFloor && matchesStatus && matchesGender && matchesYear && matchesSearch;
    });
  }, [buildingFilter, floorFilter, genderFilter, yearFilter, headerSearchValue, occupancyRows, statusFilter, studentById]);

  const activeCount = occupancyRows.filter((item) => item.status === "ACTIVE").length;
  const checkoutRequestedCount = occupancyRows.filter((item) => item.status === "CHECKOUT_REQUESTED").length;
  const checkedOutCount = occupancyRows.filter((item) => item.status === "CHECKED_OUT").length;
  const selectedStudent = selectedOccupancy ? studentById.get(selectedOccupancy.studentId) : undefined;
  const violationStudent = violationTarget ? studentById.get(violationTarget.studentId) : undefined;
  const selectedViolationType = useMemo(
    () => violationTypes.find((item) => item.id === Number(violationTypeId)) ?? null,
    [violationTypeId, violationTypes],
  );

  const availableActivityActions = useMemo<ActivityAction[]>(() => {
    if (!selectedViolationType || selectedViolationType.category === "positive") {
      return ["reward_recorded"];
    }

    if (selectedViolationType.level === "MINOR") {
      return ["reminded"];
    }

    if (selectedViolationType.level === "MEDIUM") {
      return ["warned"];
    }

    return ["warned", "force_evicted"];
  }, [selectedViolationType]);

  const summaryCards = [
    {
      label: "Đang lưu trú",
      value: activeCount,
      valueClassName: "text-[#16784b]",
      delay: 0.12,
    },
    {
      label: "Yêu cầu thôi ở",
      value: checkoutRequestedCount,
      valueClassName: "text-[#9b6b00]",
      delay: 0.18,
    },
    {
      label: "Đã thôi ở",
      value: checkedOutCount,
      valueClassName: "text-[#667085]",
      delay: 0.24,
    },
    {
      label: "Tổng lưu trú",
      value: occupancyRows.length,
      valueClassName: "text-[#244cb8]",
      delay: 0.3,
    },
  ];

  useEffect(() => {
    let isActive = true;

    const loadOccupancies = async () => {
      setIsLoadingOccupancies(true);
      setLoadError("");

      try {
        const [registrations, rooms] = await Promise.all([getRegistrations(), getRooms()]);
        const mapped = createOccupancyRowsFromApi(registrations, rooms);

        if (isActive) {
          setOccupancyRows(mapped.occupancies);
          setStudentRows(mapped.students);
        }
      } catch (error) {
        if (isActive) {
          setOccupancyRows([]);
          setStudentRows([]);
          setLoadError(error instanceof Error ? error.message : "Không thể tải dữ liệu lưu trú.");
        }
      } finally {
        if (isActive) {
          setIsLoadingOccupancies(false);
        }
      }
    };

    void loadOccupancies();

    const refreshOccupancies = () => {
      void loadOccupancies();
    };

    window.addEventListener("ktx-registrations-updated", refreshOccupancies);
    window.addEventListener("ktx-rooms-updated", refreshOccupancies);

    return () => {
      isActive = false;
      window.removeEventListener("ktx-registrations-updated", refreshOccupancies);
      window.removeEventListener("ktx-rooms-updated", refreshOccupancies);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadTypes = async () => {
      try {
        const data = await listViolationTypes();
        if (mounted) {
          setViolationTypes(data);
        }
      } catch {
        if (mounted) {
          setViolationTypes([]);
        }
      }
    };

    void loadTypes();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isStatusFilterOpen) {
      return;
    }

    const updateMenuPosition = () => {
      const buttonRect = statusFilterButtonRef.current?.getBoundingClientRect();

      if (!buttonRect) {
        return;
      }

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

  // Sync ref for stable callbacks
  useEffect(() => {
    occupancyRowsRef.current = occupancyRows;
  }, [occupancyRows]);

  const handleSuggestionSelect = (suggestion: { registration_id: number | null }) => {
    const occupancy = occupancyRowsRef.current.find((item) => item.id === suggestion.registration_id);
    if (occupancy) {
      setOccupancyDetail(null);
      setShowAllRoomChanges(false);
      setIsLoadingDetail(true);
      setSelectedOccupancy(occupancy);
      setIsStatusFilterOpen(false);
      if (occupancy.occupancyId) {
        fetchOccupancyDetail(occupancy.occupancyId)
          .then((detail) => setOccupancyDetail(detail))
          .catch(() => setOccupancyDetail(null))
          .finally(() => setIsLoadingDetail(false));
      } else {
        setIsLoadingDetail(false);
      }
    }
    setNavAutocomplete(null);
    setIsFaceSearchModalOpen(false);
  };

  // Navbar autocomplete — debounced on headerSearchValue
  useEffect(() => {
    const trimmed = headerSearchValue.trim();
    if (!trimmed) {
      setNavAutocomplete(null);
      return;
    }
    setNavAutocomplete((prev) =>
      prev ? { ...prev, isSearching: true } : { suggestions: [], isSearching: true, onSelect: () => {}, onDismiss: () => setNavAutocomplete(null) },
    );
    const timer = setTimeout(() => {
      searchStudentsForOccupancy(trimmed, 8)
        .then((results) => {
          setNavAutocomplete({
            suggestions: results,
            isSearching: false,
            onSelect: handleSuggestionSelect,
            onDismiss: () => setNavAutocomplete(null),
          });
        })
        .catch(() => setNavAutocomplete(null));
    }, 300);
    return () => clearTimeout(timer);
  }, [headerSearchValue, setNavAutocomplete]);

  // Clear navbar autocomplete on unmount
  useEffect(() => {
    return () => setNavAutocomplete(null);
  }, [setNavAutocomplete]);

  // Đăng ký nút mở modal tìm kiếm bằng khuôn mặt vào header dùng chung
  useEffect(() => {
    setOnOpenFaceSearch(() => () => setIsFaceSearchModalOpen(true));
    return () => setOnOpenFaceSearch(null);
  }, [setOnOpenFaceSearch]);

  useEffect(() => {
    setActivityAction(availableActivityActions[0] ?? "reminded");
  }, [availableActivityActions]);

  const handleOpenStatusFilter = () => {
    setDraftStatusFilter(statusFilter);
    setIsStatusFilterOpen(true);
  };

  const handleResetStatusFilter = () => {
    setDraftStatusFilter("ALL");
    setStatusFilter("ALL");
    setIsStatusFilterOpen(false);
  };

  const handleApplyStatusFilter = () => {
    setStatusFilter(draftStatusFilter);
    setIsStatusFilterOpen(false);
  };

  const updateOccupancyStatus = async (id: number, status: OccupancyStatus, forcedCheckoutReason?: string) => {
    const getUpdatedOccupancy = (item: Occupancy) => {
      if (item.id !== id) {
        return item;
      }

      if (status === "FORCED_CHECKOUT") {
        return { ...item, status, forcedCheckoutReason };
      }

      return { ...item, status, forcedCheckoutReason: undefined };
    };

    if (status === "FORCED_CHECKOUT") {
      await forceCheckoutForRegistration(id, forcedCheckoutReason ?? "");
    }

    if (status === "CHECKED_OUT") {
      await confirmCheckoutForRegistration(id);
    }

    const updatedOccupancy = occupancyRows.map(getUpdatedOccupancy).find((item) => item.id === id) ?? null;
    setOccupancyRows((current) => current.map(getUpdatedOccupancy));
    setSelectedOccupancy((current) => {
      if (!current || current.id !== id) {
        return current;
      }

      return updatedOccupancy ?? getUpdatedOccupancy(current);
    });
  };

  const handleCloseForceCheckoutModal = () => {
    setForceCheckoutTarget(null);
    setForceCheckoutReason("");
    setForceCheckoutReasonError("");
  };

  const handleConfirmForceCheckout = () => {
    const trimmedReason = forceCheckoutReason.trim();

    if (!trimmedReason) {
      setForceCheckoutReasonError("Vui lòng nhập lý do buộc thôi ở.");
      return;
    }

    if (forceCheckoutTarget) {
      void updateOccupancyStatus(forceCheckoutTarget.id, "FORCED_CHECKOUT", trimmedReason);
    }

    handleCloseForceCheckoutModal();
  };

  const handleOpenDetail = (item: Occupancy) => {
    setSelectedOccupancy(item);
    setOccupancyDetail(null);
    setShowAllRoomChanges(false);
    setIsStatusFilterOpen(false);

    if (item.occupancyId) {
      setIsLoadingDetail(true);
      fetchOccupancyDetail(item.occupancyId)
        .then((data) => { setOccupancyDetail(data); })
        .catch(() => { setOccupancyDetail(null); })
        .finally(() => { setIsLoadingDetail(false); });
    }
  };

  const resetViolationForm = () => {
    setViolationTypeId("");
    setViolationDate(getTodayValue());
    setViolationNote("");
    setActivityAction("reminded");
    setViolationFormError("");
  };

  const handleOpenViolations = (item: Occupancy) => {
    if (!canAddViolation(item)) {
      return;
    }

    setViolationTarget(item);
    setSelectedOccupancy(null);
    setIsStatusFilterOpen(false);
    resetViolationForm();
  };

  const handleCloseViolations = () => {
    setViolationTarget(null);
    resetViolationForm();
  };

  const handleSubmitViolation = async () => {
    const occupancyId = violationTarget?.occupancyId;
    const typeId = Number(violationTypeId);

    if (!canAddViolation(violationTarget)) {
      setViolationFormError("Sinh viên không còn lưu trú tại KTX, không thể ghi nhận hoạt động mới.");
      return;
    }

    if (!occupancyId) {
      setViolationFormError("Không tìm thấy mã lưu trú để ghi nhận hoạt động.");
      return;
    }

    if (!typeId) {
      setViolationFormError("Vui lòng chọn loại hoạt động.");
      return;
    }

    if (!violationDate) {
      setViolationFormError("Vui lòng chọn ngày hoạt động.");
      return;
    }

    setIsSavingViolation(true);
    setViolationFormError("");

    const payload = {
      occupancy_id: occupancyId,
      type_id: typeId,
      violation_date: violationDate,
      note: violationNote.trim(),
      action_taken: activityAction,
    };

    try {
      await createViolation(payload);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ktx-violations-updated"));
      }
      handleCloseViolations();
    } catch {
      setViolationFormError("Không thể lưu hoạt động. Vui lòng thử lại.");
    } finally {
      setIsSavingViolation(false);
    }
  };

  if (isLoadingOccupancies) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex min-h-[calc(100vh-8rem)] flex-col gap-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
          <h1 className="text-[28px] font-bold tracking-tight text-[#1a2d52]">Quản lý lưu trú</h1>
          <p className="mt-1 text-sm text-[#62789f]">
            Đang tải danh sách sinh viên đang lưu trú, trạng thái thôi ở và thông tin phòng giường.
          </p>
        </div>

        <div className="rounded-[20px] border border-[#d8e4f5] bg-white px-6 py-10 text-center">
          <div className="text-sm text-[#62789f]">Đang tải dữ liệu, vui lòng chờ...</div>
        </div>
      </motion.section>
    );
  }

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        <motion.div
          transition={{ duration: 0.2 }}
          className="auth-reveal is-visible rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-sm transition-all duration-300 ease-out hover:shadow-[0_24px_56px_rgba(36,76,184,0.14)] sm:px-8"
        >
          <div className="space-y-4">
            <div>
              <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">
                Quản lý lưu trú
              </h1>
              <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[#62789f] sm:text-sm">
                Theo dõi danh sách sinh viên đang lưu trú, trạng thái thôi ở và thông tin phòng giường.
              </p>
            </div>

            {/* Filter selects */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <select
                value={buildingFilter}
                onChange={(event) => setBuildingFilter(event.target.value)}
                className="h-11 w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-3 text-sm font-semibold text-[#1f3152] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
              >
                <option value="ALL">Tất cả tòa</option>
                {buildingOptions.map((building) => (
                  <option key={building} value={building}>Tòa {building}</option>
                ))}
              </select>

              <select
                value={floorFilter}
                onChange={(event) => setFloorFilter(event.target.value)}
                className="h-11 w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-3 text-sm font-semibold text-[#1f3152] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
              >
                <option value="ALL">Tất cả tầng</option>
                {floorOptions.map((floor) => (
                  <option key={floor} value={floor}>Tầng {floor}</option>
                ))}
              </select>

              <select
                value={genderFilter}
                onChange={(event) => setGenderFilter(event.target.value as "ALL" | "MALE" | "FEMALE")}
                className="h-11 w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-3 text-sm font-semibold text-[#1f3152] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
              >
                <option value="ALL">Tất cả giới tính</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
              </select>

              <select
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
                className="h-11 w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-3 text-sm font-semibold text-[#1f3152] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
              >
                <option value="ALL">Tất cả năm học</option>
                <option value="1">Năm 1</option>
                <option value="2">Năm 2</option>
                <option value="3">Năm 3</option>
                <option value="4">Năm 4</option>
              </select>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <motion.article
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: card.delay, ease: "easeOut" }}
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

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.46, delay: 0.16, ease: "easeOut" }}
          className="relative mt-1 min-h-[420px] overflow-hidden rounded-[14px] border border-[#d6e2f1] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.10)]"
        >
          <table className="w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[23%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[18%]" />
              <col className="w-[28%]" />
            </colgroup>
            <thead>
              <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                <th className="whitespace-nowrap px-2 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  MSSV
                </th>
                <th className="whitespace-nowrap px-2 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  Họ tên
                </th>
                <th className="whitespace-nowrap px-2 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  Phòng
                </th>
                <th className="whitespace-nowrap px-2 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  Giường
                </th>
                <th className="relative z-30 whitespace-nowrap px-2 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  <div className="inline-flex flex-nowrap items-center justify-center gap-2">
                    <span>Trạng thái</span>
                    <button
                      ref={statusFilterButtonRef}
                      type="button"
                      onClick={isStatusFilterOpen ? () => setIsStatusFilterOpen(false) : handleOpenStatusFilter}
                      className={`flex items-center justify-center transition ${
                        statusFilter !== "ALL" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"
                      }`}
                      aria-label="Bật lọc trạng thái"
                      title="Bật lọc trạng thái"
                    >
                      <Funnel className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
                <th className="whitespace-nowrap px-2 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody>
              {loadError ? (
                <tr>
                  <td colSpan={6} className="border-t border-[#e8eef8] px-4 py-14 text-center text-sm font-semibold text-[#cc3c4f]">
                    {loadError}
                  </td>
                </tr>
              ) : visibleOccupancies.length > 0 ? (
                visibleOccupancies.map((item, index) => {
                  const meta = getStatusMeta(item.status);
                  const StatusIcon = meta.Icon;
                  const student = studentById.get(item.studentId);

                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 + index * 0.035, ease: "easeOut" }}
                      className="group transition duration-200 hover:bg-[#f8fbff]"
                    >
                      <td className="overflow-hidden border-t border-[#e8eef8] px-2 py-4 text-center text-[15px] font-semibold text-[#24407f]">
                        <span className="block truncate whitespace-nowrap" title={student?.studentCode ?? emptyValue}>
                          {student?.studentCode ?? emptyValue}
                        </span>
                      </td>
                      <td className="overflow-hidden border-t border-[#e8eef8] px-2 py-4 text-center text-sm font-semibold text-[#1f3152]">
                        <span className="block truncate whitespace-nowrap" title={student?.fullName ?? emptyValue}>
                          {student?.fullName ?? emptyValue}
                        </span>
                      </td>
                      <td className="overflow-hidden whitespace-nowrap border-t border-[#e8eef8] px-2 py-4 text-center text-sm font-semibold text-[#6d7fa6]">
                        <span className="block truncate" title={`${item.buildingCode}${item.roomNumber}`}>
                          {item.buildingCode}{item.roomNumber}
                        </span>
                      </td>
                      <td className="overflow-hidden whitespace-nowrap border-t border-[#e8eef8] px-2 py-4 text-center text-sm font-semibold text-[#5a6f98]">
                        #{item.bedNumber}
                      </td>
                      <td className="overflow-hidden whitespace-nowrap border-t border-[#e8eef8] px-2 py-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${meta.badgeClassName}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="overflow-hidden whitespace-nowrap border-t border-[#e8eef8] px-2 py-4 text-center">
                        <div className="flex min-w-0 flex-nowrap items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item)}
                            className="auth-btn-gloss inline-flex min-w-0 flex-[0.85] items-center justify-center overflow-hidden whitespace-nowrap rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-2 py-2 text-[12px] font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
                          >
                            <span className="auth-btn-gloss__content block truncate">Xem chi tiết</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenViolations(item)}
                            disabled={!canAddViolation(item)}
                            title={!canAddViolation(item) ? "Sinh viên không còn lưu trú tại KTX, không thể ghi nhận hoạt động mới." : undefined}
                            className="auth-btn-gloss inline-flex min-w-0 flex-[1.15] items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-xl border border-rose-200 bg-rose-50 px-2 py-2 text-[12px] font-semibold text-rose-700 shadow-[0_8px_18px_rgba(190,24,93,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:border-rose-200 disabled:hover:bg-rose-50"
                          >
                            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                            <span className="auth-btn-gloss__content block truncate">Ghi nhận hoạt động</span>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="border-t border-[#e8eef8] px-4 py-14 text-center text-sm font-semibold text-[#5c7094]">
                    Không có dữ liệu lưu trú phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.div>
      </motion.section>

      {isStatusFilterOpen && statusFilterMenuPosition
        ? createPortal(
            <div className="fixed inset-0 z-[68]" onClick={() => setIsStatusFilterOpen(false)}>
              <div
                className="absolute w-[210px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
                style={{ top: statusFilterMenuPosition.top, left: statusFilterMenuPosition.left }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-0.5 p-2.5">
                  {statusOptions.map((option) => {
                    const isSelected = draftStatusFilter === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDraftStatusFilter(option.value)}
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

                <div className="flex items-center justify-between border-t border-[#dbe5f3] px-2.5 py-2">
                  <button
                    type="button"
                    onClick={handleResetStatusFilter}
                    className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyStatusFilter}
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

      {selectedOccupancy
          ? createPortal(
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="fixed inset-0 z-[72] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative flex max-h-[92vh] w-full max-w-[820px] flex-col overflow-hidden rounded-[28px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_72%,#e7f0ff_100%)] shadow-[0_28px_70px_rgba(27,56,122,0.28)]"
                >
                  {/* Header */}
                  <div className="flex flex-shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7d90b5]">
                      CHI TIẾT LƯU TRÚ
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedOccupancy(null)}
                      className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Scrollable content */}
                  <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-4">

                    {/* THÔNG TIN SINH VIÊN */}
                    <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                      <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                        THÔNG TIN SINH VIÊN
                      </h4>
                      <div className="mt-4 flex gap-4">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {isLoadingDetail ? (
                            <div className="h-20 w-20 animate-pulse rounded-full bg-[#d8e6f5]" />
                          ) : occupancyDetail?.student.avatar ? (
                            <img
                              src={occupancyDetail.student.avatar}
                              alt="avatar"
                              className="h-20 w-20 rounded-full border border-[#d3e0f2] object-cover shadow-sm"
                            />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#dde9ff]">
                              <span className="text-2xl font-bold text-[#5573a0]">
                                {selectedStudent?.fullName?.[0]?.toUpperCase() ?? "?"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="grid flex-1 gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                          {/* Cột trái: thông tin học vụ */}
                          <div className="flex flex-col gap-y-3">
                            <p className="text-[#5570a0]">
                              MSSV: <span className="font-semibold text-[#1b3766]">{selectedStudent?.studentCode ?? emptyValue}</span>
                            </p>
                            <p className="text-[#5570a0]">
                              Họ tên: <span className="font-semibold text-[#1b3766]">{selectedStudent?.fullName ?? emptyValue}</span>
                            </p>
                            <p className="text-[#5570a0]">
                              Lớp: <span className="font-semibold text-[#1b3766]">{getStudentText(selectedStudent, "className")}</span>
                            </p>
                            <p className="text-[#5570a0]">
                              Khoa: <span className="font-semibold text-[#1b3766]">{getStudentText(selectedStudent, "faculty")}</span>
                            </p>
                            <p className="text-[#5570a0]">
                              Năm học hiện tại:{" "}
                              <span className="font-semibold text-[#1b3766]">
                                {isLoadingDetail ? (
                                  <span className="inline-block h-3 w-12 animate-pulse rounded bg-[#d8e6f5]" />
                                ) : occupancyDetail?.student.current_year != null ? (
                                  `Năm ${occupancyDetail.student.current_year}`
                                ) : emptyValue}
                              </span>
                            </p>
                            <p className="text-[#5570a0]">
                              Email: <span className="font-semibold text-[#1b3766]">{getStudentText(selectedStudent, "email")}</span>
                            </p>
                          </div>

                          {/* Cột phải: thông tin cá nhân */}
                          <div className="flex flex-col gap-y-3">
                            <p className="text-[#5570a0]">
                              Giới tính: <span className="font-semibold text-[#1b3766]">{getGenderLabel(selectedStudent?.gender)}</span>
                            </p>
                            <p className="text-[#5570a0]">
                              Ngày sinh:{" "}
                              <span className="font-semibold text-[#1b3766]">
                                {selectedStudent?.dateOfBirth ? formatDate(selectedStudent.dateOfBirth) : emptyValue}
                              </span>
                            </p>
                            <p className="text-[#5570a0]">
                              Số điện thoại: <span className="font-semibold text-[#1b3766]">{getStudentText(selectedStudent, "phone")}</span>
                            </p>
                            {isLoadingDetail ? (
                              <div className="h-4 w-3/4 animate-pulse rounded bg-[#d8e6f5]" />
                            ) : (
                              <p className="text-[#5570a0]">
                                Địa chỉ thường trú:{" "}
                                <span className="font-semibold text-[#1b3766]">
                                  {occupancyDetail?.student.permanent_address?.trim() || emptyValue}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* THÔNG TIN LƯU TRÚ */}
                    <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                      <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                        THÔNG TIN LƯU TRÚ
                      </h4>
                      <div className="mt-4 grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                        <p className="text-[#5570a0]">
                          Phòng:{" "}
                          <span className="font-semibold text-[#1b3766]">
                            {selectedOccupancy.buildingCode}{selectedOccupancy.roomNumber}
                          </span>
                        </p>
                        <p className="text-[#5570a0]">
                          Giường: <span className="font-semibold text-[#1b3766]">#{selectedOccupancy.bedNumber}</span>
                        </p>
                        <p className="text-[#5570a0]">
                          Thời gian lưu trú:{" "}
                          <span className="font-semibold text-[#1b3766]">
                            {formatDate(selectedOccupancy.checkInDate)}
                            {" – "}
                            {selectedOccupancy.checkOutDate ? formatDate(selectedOccupancy.checkOutDate) : "nay"}
                          </span>
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[#5570a0]">
                          <span>Trạng thái lưu trú:</span>
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                              getStatusMeta(selectedOccupancy.status).badgeClassName
                            }`}
                          >
                            {getStatusMeta(selectedOccupancy.status).label}
                          </span>
                        </div>
                        {selectedOccupancy.status === "FORCED_CHECKOUT" ? (
                          <p className="text-[#5570a0] md:col-span-2">
                            Lý do buộc thôi ở:{" "}
                            <span className="font-semibold text-[#1b3766]">
                              {selectedOccupancy.forcedCheckoutReason?.trim() || emptyValue}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {selectedOccupancy.status === "CHECKOUT_REQUESTED" ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                        <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-amber-700">
                          THÔNG TIN YÊU CẦU THÔI Ở
                        </h4>
                        <div className="mt-4 grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                          <p className="text-amber-800">
                            Ngày dự kiến rời KTX:{" "}
                            <span className="font-semibold">
                              {selectedOccupancy.leaveRequest?.expectedLeaveDate
                                ? formatDate(selectedOccupancy.leaveRequest.expectedLeaveDate)
                                : emptyValue}
                            </span>
                          </p>
                          <p className="text-amber-800 md:col-span-2">
                            Lý do:{" "}
                            <span className="font-semibold">{selectedOccupancy.leaveRequest?.reason?.trim() || emptyValue}</span>
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {/* THÔNG TIN GIA ĐÌNH */}
                    {isLoadingDetail ? (
                      <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                        <div className="mb-4 h-3.5 w-40 animate-pulse rounded bg-[#d8e6f5]" />
                        <div className="space-y-3">
                          <div className="rounded-xl border border-[#e6eef8] bg-[#f5f9ff] p-3">
                            <div className="mb-2 h-3 w-8 animate-pulse rounded bg-[#d8e6f5]" />
                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="h-4 animate-pulse rounded bg-[#d8e6f5]" />
                              <div className="h-4 animate-pulse rounded bg-[#d8e6f5]" />
                              <div className="h-4 animate-pulse rounded bg-[#d8e6f5]" />
                            </div>
                          </div>
                          <div className="rounded-xl border border-[#e6eef8] bg-[#f5f9ff] p-3">
                            <div className="mb-2 h-3 w-6 animate-pulse rounded bg-[#d8e6f5]" />
                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="h-4 animate-pulse rounded bg-[#d8e6f5]" />
                              <div className="h-4 animate-pulse rounded bg-[#d8e6f5]" />
                              <div className="h-4 animate-pulse rounded bg-[#d8e6f5]" />
                            </div>
                          </div>
                          <div className="h-4 w-2/3 animate-pulse rounded bg-[#d8e6f5]" />
                        </div>
                      </div>
                    ) : occupancyDetail ? (
                      <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                        <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                          THÔNG TIN GIA ĐÌNH
                        </h4>
                        <div className="mt-4 space-y-3">
                          {/* Cha */}
                          <div className="rounded-xl border border-[#e6eef8] bg-[#f5f9ff] p-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8aa4cc]">Cha</p>
                            <div className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                              <p className="text-[#5570a0]">
                                Họ tên:{" "}
                                <span className="font-semibold text-[#1b3766]">
                                  {occupancyDetail.family.father_name?.trim() || emptyValue}
                                </span>
                              </p>
                              <p className="text-[#5570a0]">
                                Năm sinh:{" "}
                                <span className="font-semibold text-[#1b3766]">
                                  {occupancyDetail.family.father_birth_year?.trim() || emptyValue}
                                </span>
                              </p>
                              <p className="text-[#5570a0]">
                                SĐT:{" "}
                                <span className="font-semibold text-[#1b3766]">
                                  {occupancyDetail.family.father_phone?.trim() || emptyValue}
                                </span>
                              </p>
                              <p className="text-[#5570a0]">
                                Nghề nghiệp:{" "}
                                <span className="font-semibold text-[#1b3766]">
                                  {occupancyDetail.family.father_occupation?.trim() || emptyValue}
                                </span>
                              </p>
                            </div>
                          </div>
                          {/* Mẹ */}
                          <div className="rounded-xl border border-[#e6eef8] bg-[#f5f9ff] p-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8aa4cc]">Mẹ</p>
                            <div className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                              <p className="text-[#5570a0]">
                                Họ tên:{" "}
                                <span className="font-semibold text-[#1b3766]">
                                  {occupancyDetail.family.mother_name?.trim() || emptyValue}
                                </span>
                              </p>
                              <p className="text-[#5570a0]">
                                Năm sinh:{" "}
                                <span className="font-semibold text-[#1b3766]">
                                  {occupancyDetail.family.mother_birth_year?.trim() || emptyValue}
                                </span>
                              </p>
                              <p className="text-[#5570a0]">
                                SĐT:{" "}
                                <span className="font-semibold text-[#1b3766]">
                                  {occupancyDetail.family.mother_phone?.trim() || emptyValue}
                                </span>
                              </p>
                              <p className="text-[#5570a0]">
                                Nghề nghiệp:{" "}
                                <span className="font-semibold text-[#1b3766]">
                                  {occupancyDetail.family.mother_occupation?.trim() || emptyValue}
                                </span>
                              </p>
                            </div>
                          </div>
                          {/* Địa chỉ liên hệ gia đình */}
                          <p className="px-1 text-sm text-[#5570a0]">
                            Địa chỉ liên hệ:{" "}
                            <span className="font-semibold text-[#1b3766]">
                              {occupancyDetail.family.parent_address?.trim() || emptyValue}
                            </span>
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {/* LỊCH SỬ LƯU TRÚ */}
                    {isLoadingDetail ? (
                      <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                        <div className="mb-4 h-3.5 w-36 animate-pulse rounded bg-[#d8e6f5]" />
                        <div className="space-y-2">
                          {[1, 2].map((i) => (
                            <div key={i} className="flex gap-4">
                              <div className="h-4 flex-1 animate-pulse rounded bg-[#d8e6f5]" />
                              <div className="h-4 flex-1 animate-pulse rounded bg-[#d8e6f5]" />
                              <div className="h-4 flex-1 animate-pulse rounded bg-[#d8e6f5]" />
                              <div className="h-4 flex-1 animate-pulse rounded bg-[#d8e6f5]" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : occupancyDetail ? (
                      <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                        <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                          LỊCH SỬ LƯU TRÚ
                        </h4>
                        {occupancyDetail.occupancy_history.length === 0 ? (
                          <p className="mt-3 text-sm text-[#7a9cc0]">Đây là lần lưu trú đầu tiên.</p>
                        ) : (
                          <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[#dce9f5] text-left text-xs font-semibold uppercase tracking-wide text-[#8aa4cc]">
                                  <th className="pb-2 pr-4">Năm học</th>
                                  <th className="pb-2 pr-4">Học kỳ</th>
                                  <th className="pb-2 pr-4">Phòng</th>
                                  <th className="pb-2 pr-4">Giường</th>
                                  <th className="pb-2 pr-4">Ngày vào</th>
                                  <th className="pb-2">Ngày ra</th>
                                </tr>
                              </thead>
                              <tbody>
                                {occupancyDetail.occupancy_history.map((h) => (
                                  <tr
                                    key={h.id}
                                    className={`border-b border-[#edf3fb] last:border-0 ${h.is_current ? "bg-blue-50/60" : ""}`}
                                  >
                                    <td className="py-2 pr-4 text-[#1b3766]">
                                      {h.school_year ?? emptyValue}
                                      {h.is_current && (
                                        <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                                          Hiện tại
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 pr-4 text-[#1b3766]">{h.semester ?? emptyValue}</td>
                                    <td className="py-2 pr-4 font-medium text-[#1b3766]">
                                      {h.building_code}{h.room_number || emptyValue}
                                    </td>
                                    <td className="py-2 pr-4 text-[#1b3766]">
                                      {h.bed_number ? `#${h.bed_number}` : emptyValue}
                                    </td>
                                    <td className="py-2 pr-4 text-[#1b3766]">
                                      {h.check_in_date ? formatDate(h.check_in_date) : emptyValue}
                                    </td>
                                    <td className="py-2 text-[#1b3766]">
                                      {h.check_out_date ? (
                                        <span>
                                          {formatDate(h.check_out_date)}
                                          {h.status === "ACTIVE" && (() => {
                                            const days = Math.ceil((new Date(h.check_out_date).getTime() - Date.now()) / 86_400_000);
                                            return days >= 0 && days < 30 ? (
                                              <span className="ml-1 text-[10px] font-semibold text-amber-500">
                                                (còn {days} ngày)
                                              </span>
                                            ) : null;
                                          })()}
                                        </span>
                                      ) : (
                                        <span className="text-[#8aa4cc]">Chưa xác định</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* VI PHẠM GẦN ĐÂY */}
                    {isLoadingDetail ? (
                      <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                        <div className="mb-4 h-3.5 w-32 animate-pulse rounded bg-[#d8e6f5]" />
                        <div className="space-y-2">
                          {[1, 2].map((i) => (
                            <div key={i} className="h-10 animate-pulse rounded-xl bg-[#d8e6f5]" />
                          ))}
                        </div>
                      </div>
                    ) : occupancyDetail ? (
                      <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                        <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                          VI PHẠM GẦN ĐÂY
                        </h4>
                        {occupancyDetail.recent_violations.length === 0 ? (
                          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                            Không có vi phạm nào được ghi nhận.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {occupancyDetail.recent_violations.map((v) => (
                              <div key={v.id} className="flex items-start gap-3 rounded-xl border border-[#e6eef8] bg-[#f5f9ff] px-3 py-2.5 text-sm">
                                <div className="flex-1">
                                  <span className="font-semibold text-[#1b3766]">{v.type_name || emptyValue}</span>
                                  {v.note ? (
                                    <span className="ml-1 text-[#7a9cc0]">— {v.note}</span>
                                  ) : null}
                                  <span className="ml-2 text-xs text-[#9ab2ce]">
                                    {v.activity_date ? formatDate(v.activity_date) : ""}
                                  </span>
                                </div>
                                {v.level ? (
                                  <span
                                    className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                                      v.level === "SERIOUS"
                                        ? "border-red-200 bg-red-50 text-red-700"
                                        : v.level === "MEDIUM"
                                          ? "border-orange-200 bg-orange-50 text-orange-700"
                                          : "border-yellow-200 bg-yellow-50 text-yellow-700"
                                    }`}
                                  >
                                    {v.level === "SERIOUS" ? "Nghiêm trọng" : v.level === "MEDIUM" ? "Trung bình" : "Nhẹ"}
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* TÌNH TRẠNG HÓA ĐƠN */}
                    {isLoadingDetail ? (
                      <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                        <div className="mb-4 h-3.5 w-40 animate-pulse rounded bg-[#d8e6f5]" />
                        <div className="space-y-2">
                          <div className="h-12 animate-pulse rounded-xl bg-[#d8e6f5]" />
                          <div className="h-12 animate-pulse rounded-xl bg-[#d8e6f5]" />
                        </div>
                      </div>
                    ) : occupancyDetail ? (
                      <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                        <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                          TÌNH TRẠNG HÓA ĐƠN
                        </h4>
                        <div className="mt-3 space-y-3 text-sm">
                          {/* Hóa đơn tháng hiện tại */}
                          {occupancyDetail.current_invoice ? (
                            <div className="flex items-center justify-between rounded-xl border border-[#e6eef8] bg-[#f5f9ff] px-4 py-3">
                              <span className="text-[#5570a0]">
                                Hóa đơn tháng {occupancyDetail.current_invoice.month}/{occupancyDetail.current_invoice.year}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-[#1b3766]">
                                  {occupancyDetail.current_invoice.amount.toLocaleString("vi-VN")}₫
                                </span>
                                <span
                                  className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                                    occupancyDetail.current_invoice.status === "paid" || occupancyDetail.current_invoice.status === "exempted"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-amber-200 bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {occupancyDetail.current_invoice.status === "paid"
                                    ? "Đã thanh toán"
                                    : occupancyDetail.current_invoice.status === "exempted"
                                      ? "Đã miễn"
                                      : "Chưa thanh toán"}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[#7a9cc0]">Chưa có hóa đơn tháng này.</p>
                          )}
                          {/* Tổng nợ */}
                          {occupancyDetail.total_debt > 0 ? (
                            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                              <span className="font-semibold text-rose-700">Tổng nợ hiện tại</span>
                              <span className="text-lg font-bold text-rose-600">
                                {occupancyDetail.total_debt.toLocaleString("vi-VN")}₫
                              </span>
                            </div>
                          ) : (
                            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 font-medium text-emerald-700">
                              Không có khoản nợ.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {/* YÊU CẦU HỖ TRỢ */}
                    {isLoadingDetail ? (
                      <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                        <div className="mb-4 h-3.5 w-44 animate-pulse rounded bg-[#d8e6f5]" />
                        <div className="space-y-2">
                          <div className="h-10 animate-pulse rounded-xl bg-[#d8e6f5]" />
                          <div className="h-10 animate-pulse rounded-xl bg-[#d8e6f5]" />
                        </div>
                      </div>
                    ) : occupancyDetail ? (
                      <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                        <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                          YÊU CẦU HỖ TRỢ
                        </h4>
                        {occupancyDetail.support_requests.length === 0 ? (
                          <p className="mt-3 text-sm text-[#7a9cc0]">Chưa có yêu cầu nào.</p>
                        ) : (
                          <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr className="border-b border-[#dce9f5] text-xs font-semibold uppercase tracking-wide text-[#8aa4cc]">
                                  <th className="pb-2 pr-4">Loại yêu cầu</th>
                                  <th className="pb-2 pr-4">Tiêu đề</th>
                                  <th className="pb-2 pr-4">Ngày gửi</th>
                                  <th className="pb-2">Trạng thái</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#edf3fb]">
                                {occupancyDetail.support_requests.map((req) => {
                                  const typeLabel: Record<string, string> = {
                                    room_change: "Chuyển phòng",
                                    bed_change: "Chuyển giường",
                                    roommate_request: "Yêu cầu ở cùng",
                                    complaint: "Khiếu nại",
                                    suggestion: "Góp ý",
                                    maintenance_report: "Báo hỏng",
                                    other: "Khác",
                                  };
                                  const statusMeta: Record<string, { label: string; cls: string }> = {
                                    pending:    { label: "Chờ xử lý",   cls: "border-amber-200 bg-amber-50 text-amber-700" },
                                    processing: { label: "Đang xử lý",  cls: "border-blue-200 bg-blue-50 text-blue-700" },
                                    approved:   { label: "Đã duyệt",    cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
                                    rejected:   { label: "Từ chối",     cls: "border-rose-200 bg-rose-50 text-rose-700" },
                                    completed:  { label: "Hoàn thành",  cls: "border-slate-200 bg-slate-50 text-slate-600" },
                                  };
                                  const sm = statusMeta[req.status] ?? { label: req.status, cls: "border-gray-200 bg-gray-50 text-gray-600" };
                                  return (
                                    <tr key={req.id} className="text-[#2d4a7a]">
                                      <td className="py-2 pr-4 font-medium">
                                        {typeLabel[req.request_type] ?? req.request_type}
                                      </td>
                                      <td className="py-2 pr-4 text-[#5570a0]">
                                        {req.title ?? "—"}
                                      </td>
                                      <td className="py-2 pr-4 text-[#5570a0]">
                                        {req.created_at
                                          ? new Date(req.created_at).toLocaleDateString("vi-VN")
                                          : "—"}
                                      </td>
                                      <td className="py-2">
                                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${sm.cls}`}>
                                          {sm.label}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* LỊCH SỬ CHUYỂN PHÒNG/GIƯỜNG */}
                    {isLoadingDetail ? (
                      <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                        <div className="mb-4 h-3.5 w-56 animate-pulse rounded bg-[#d8e6f5]" />
                        <div className="space-y-2">
                          <div className="h-10 animate-pulse rounded-xl bg-[#d8e6f5]" />
                          <div className="h-10 animate-pulse rounded-xl bg-[#d8e6f5]" />
                        </div>
                      </div>
                    ) : occupancyDetail ? (() => {
                        const PAGE = 5;
                        const allLogs = occupancyDetail.room_change_history;
                        const visibleLogs = showAllRoomChanges ? allLogs : allLogs.slice(-PAGE);
                        const hasMore = allLogs.length > PAGE;

                        const getBadge = (log: (typeof allLogs)[number]): { label: string; cls: string } => {
                          if (log.change_type === "PERMANENT") {
                            const sameRoom = log.old_room_code === log.new_room_code && log.old_room_code !== null;
                            return sameRoom
                              ? { label: "Đổi giường",   cls: "border-blue-200 bg-blue-50 text-blue-700" }
                              : { label: "Chuyển phòng", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" };
                          }
                          if (log.change_type === "TEMPORARY_MAINTENANCE") {
                            return log.is_temporary
                              ? { label: "Tạm chuyển",          cls: "border-amber-200 bg-amber-50 text-amber-700" }
                              : { label: "Trả về sau bảo trì",  cls: "border-cyan-200 bg-cyan-50 text-cyan-700" };
                          }
                          if (log.change_type === "ADMIN_TRANSFER") return { label: "Admin chuyển", cls: "border-slate-200 bg-slate-100 text-slate-600" };
                          if (log.change_type === "SWAP")            return { label: "Hoán đổi",    cls: "border-violet-200 bg-violet-50 text-violet-700" };
                          return { label: log.change_type, cls: "border-gray-200 bg-gray-50 text-gray-600" };
                        };

                        const formatLocation = (roomCode: string | null, bedNumber: string | null) => {
                          if (!roomCode) return "—";
                          return bedNumber ? `${roomCode} #${bedNumber}` : roomCode;
                        };

                        const formatDetail = (log: (typeof allLogs)[number]) => {
                          const from = formatLocation(log.old_room_code, log.old_bed_number);
                          const to   = formatLocation(log.new_room_code, log.new_bed_number);
                          if (log.old_room_code && log.new_room_code && log.old_room_code === log.new_room_code) {
                            return `Phòng ${log.old_room_code}: #${log.old_bed_number ?? "?"} → #${log.new_bed_number ?? "?"}`;
                          }
                          return `${from} → ${to}`;
                        };

                        return (
                          <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                              LỊCH SỬ CHUYỂN PHÒNG/GIƯỜNG
                            </h4>
                            {allLogs.length === 0 ? (
                              <p className="mt-3 text-sm text-[#7a9cc0]">Chưa có lịch sử chuyển phòng/giường.</p>
                            ) : (
                              <>
                                <div className="mt-3 overflow-x-auto">
                                  <table className="w-full text-left text-sm">
                                    <thead>
                                      <tr className="border-b border-[#dce9f5] text-xs font-semibold uppercase tracking-wide text-[#8aa4cc]">
                                        <th className="pb-2 pr-4">Ngày</th>
                                        <th className="pb-2 pr-4">Loại</th>
                                        <th className="pb-2 pr-4">Chi tiết</th>
                                        <th className="pb-2">Nguồn</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#edf3fb]">
                                      {visibleLogs.map((log) => {
                                        const badge = getBadge(log);
                                        return (
                                          <tr key={log.id} className="text-[#2d4a7a]">
                                            <td className="py-2 pr-4 text-[#5570a0]">
                                              {log.transferred_at
                                                ? new Date(log.transferred_at).toLocaleDateString("vi-VN")
                                                : "—"}
                                            </td>
                                            <td className="py-2 pr-4">
                                              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.cls}`}>
                                                {badge.label}
                                              </span>
                                            </td>
                                            <td className="py-2 pr-4 font-medium">
                                              {formatDetail(log)}
                                            </td>
                                            <td className="py-2 text-[#5570a0]">
                                              {log.change_source === "student_request" ? "Sinh viên" : "Admin"}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                                {hasMore && (
                                  <button
                                    type="button"
                                    onClick={() => setShowAllRoomChanges((v) => !v)}
                                    className="mt-2 text-xs font-semibold text-[#2f63da] hover:underline"
                                  >
                                    {showAllRoomChanges ? "Thu gọn" : `Xem thêm ${allLogs.length - PAGE} mục`}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()
                    : null}

                  </div>

                  {/* Footer */}
                  <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[#d3e0f2] px-6 py-4">
                    {selectedOccupancy.status === "CHECKOUT_REQUESTED" ? (
                      <button
                        type="button"
                        onClick={() => void updateOccupancyStatus(selectedOccupancy.id, "CHECKED_OUT")}
                        className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#1f9a60_0%,#35bf7a_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(31,154,96,0.22)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
                      >
                        <span className="auth-btn-gloss__content">Xác nhận thôi ở</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setSelectedOccupancy(null)}
                      className="rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
                    >
                      Đóng
                    </button>
                  </div>
                </motion.div>
              </motion.div>,
              document.body,
            )
          : null}

      {violationTarget
        ? createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-0 z-[82] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="relative flex max-h-[88vh] w-full max-w-[960px] flex-col overflow-hidden rounded-[28px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_72%,#e7f0ff_100%)] shadow-[0_28px_70px_rgba(27,56,122,0.28)]"
              >
                <div className="flex items-start justify-between gap-4 border-b border-[#d3e0f2] px-6 py-5">
                  <div>
                    <p className="text-xl font-bold uppercase  text-[#7d90b5]">
                      GHI NHẬN HOẠT ĐỘNG
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-[#173a78]">
                      {violationStudent?.fullName ?? emptyValue}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-[#62789f]">
                      {violationStudent?.studentCode ?? emptyValue} - Phòng {violationTarget.buildingCode}
                      {violationTarget.roomNumber} - Giường #{violationTarget.bedNumber}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseViolations}
                    className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                  <div className="mx-auto w-full max-w-[860px]">
                    <div className="rounded-2xl border border-[#d3e0f2] bg-white/75 p-4">
                      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                        Thông tin sinh viên
                      </h3>
                      <div className="mt-4 grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                        <p className="text-[#5570a0]">
                          MSSV: <span className="font-semibold text-[#1b3766]">{violationStudent?.studentCode ?? emptyValue}</span>
                        </p>
                        <p className="text-[#5570a0]">
                          Họ tên: <span className="font-semibold text-[#1b3766]">{violationStudent?.fullName ?? emptyValue}</span>
                        </p>
                        <p className="text-[#5570a0]">
                          Phòng: <span className="font-semibold text-[#1b3766]">{violationTarget.buildingCode}{violationTarget.roomNumber}</span>
                        </p>
                        <p className="text-[#5570a0]">
                          Giường: <span className="font-semibold text-[#1b3766]">#{violationTarget.bedNumber}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#d3e0f2] bg-white/75 p-4">
                      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                        Ghi nhận hoạt động
                      </h3>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="block md:col-span-2">
                          <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Loại hoạt động *</span>
                          <select
                            value={violationTypeId}
                            onChange={(event) => {
                              setViolationTypeId(event.target.value);
                              setViolationFormError("");
                            }}
                            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10"
                          >
                            <option value="">Chọn loại hoạt động</option>
                            {violationTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Phân loại</span>
                          <div className="mt-2 flex h-11 w-full items-center rounded-xl border border-slate-200 bg-white px-3.5 shadow-sm">
                            {selectedViolationType ? (
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ${
                                  categoryMeta[selectedViolationType.category].badgeClassName
                                }`}
                              >
                                {categoryMeta[selectedViolationType.category].label}
                              </span>
                            ) : (
                              <span className="text-sm font-semibold text-[#8a9abb]">-</span>
                            )}
                          </div>
                        </label>

                        <label className="block">
                          <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Mức độ</span>
                          <div className="mt-2 flex h-11 w-full items-center rounded-xl border border-slate-200 bg-white px-3.5 shadow-sm">
                            {selectedViolationType?.category === "negative" ? (
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ${
                                  levelMeta[selectedViolationType.level].badgeClassName
                                }`}
                              >
                                {levelMeta[selectedViolationType.level].label}
                              </span>
                            ) : (
                              <span className="text-sm font-semibold text-[#8a9abb]">-</span>
                            )}
                          </div>
                        </label>

                        <label className="block">
                          <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Ngày hoạt động *</span>
                          <input
                            type="date"
                            value={violationDate}
                            onChange={(event) => {
                              setViolationDate(event.target.value);
                              setViolationFormError("");
                            }}
                            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10"
                          />
                        </label>

                        <label className="block">
                          <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Ghi chú</span>
                          <textarea
                            value={violationNote}
                            onChange={(event) => setViolationNote(event.target.value)}
                            rows={3}
                            className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10"
                            placeholder="Nhập ghi chú hoạt động"
                          />
                        </label>

                        {selectedViolationType?.category === "negative" ? (
                          <div className="md:col-span-2">
                            <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Hướng xử lý</span>
                            <div className="mt-2 grid gap-3 sm:grid-cols-2">
                              {availableActivityActions.map((action) => (
                                <button
                                  key={action}
                                  type="button"
                                  onClick={() => setActivityAction(action)}
                                  className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                                    activityAction === action
                                      ? "border-[#244cb8] bg-[#eef5ff] text-[#173a78] shadow-[0_10px_20px_rgba(36,76,184,0.12)]"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-[#aac2ea]"
                                  }`}
                                >
                                  {actionLabels[action]}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {violationFormError ? <p className="text-sm font-semibold text-[#cc3c4f] md:col-span-2">{violationFormError}</p> : null}

                        <div className="flex flex-wrap justify-end gap-3 pt-1 md:col-span-2">
                          <button
                            type="button"
                            onClick={() => void handleSubmitViolation()}
                            disabled={isSavingViolation}
                            className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100"
                          >
                            <span className="auth-btn-gloss__content">Lưu</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>,
            document.body,
          )
        : null}

      {forceCheckoutTarget
        ? createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-[82] flex items-center justify-center bg-[rgba(14,25,48,0.50)] px-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.98 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
                className="w-full max-w-[560px] rounded-[26px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="mt-2 text-2xl font-bold text-[#173a78]">Buộc thôi ở</h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseForceCheckoutModal}
                    className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5">
                  <label className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]" htmlFor="force-checkout-reason">
                    Lý do:
                  </label>
                  <textarea
                    id="force-checkout-reason"
                    value={forceCheckoutReason}
                    onChange={(event) => {
                      setForceCheckoutReason(event.target.value);
                      if (forceCheckoutReasonError) {
                        setForceCheckoutReasonError("");
                      }
                    }}
                    rows={5}
                    className="mt-3 w-full resize-none rounded-2xl border border-[#d3e0f2] bg-white/80 px-4 py-3 text-sm font-semibold text-[#1b3766] outline-none transition placeholder:text-[#9aabc9] focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
                    placeholder="Nhập lý do để lưu lại trong hồ sơ lưu trú..."
                  />
                  {forceCheckoutReasonError ? (
                    <p className="mt-2 text-sm font-semibold text-[#cc3c4f]">{forceCheckoutReasonError}</p>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseForceCheckoutModal}
                    className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmForceCheckout}
                    className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(204,60,79,0.22)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105"
                  >
                    <span className="auth-btn-gloss__content">Xác nhận</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>,
            document.body,
          )
        : null}

      {isFaceSearchModalOpen ? (
        <FaceSearchModal
          onClose={() => setIsFaceSearchModalOpen(false)}
          onSelectStudent={handleSuggestionSelect}
        />
      ) : null}
    </>
  );
}
