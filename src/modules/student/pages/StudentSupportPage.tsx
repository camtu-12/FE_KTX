import { motion } from "framer-motion";
import {
  ArrowRightLeft,
  BedSingle,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Handshake,
  LifeBuoy,
  Plus,
  Send,
  X,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  createSupportRequest,
  getRoommateTargetInfo,
  listMySupportRequests,
  type RoommateTargetInfo,
  type SupportRequestStatus,
  type SupportRequestType,
  type StudentSupportRequest,
} from "../../../api/studentSupportApi";
import type { MyRoom } from "../../../mocks/myRoom";
import { formatDate } from "../../../utils/dateFormat";
import { useAuthStore } from "../../auth/store";
import { getRooms } from "../../../api/registrationService";
import { getMyOccupancyFromBackend } from "../services/occupancyService";
import type { DormRoom } from "../../../types/dormRoom";

type SupportCategory = "room-change" | "bed-change" | "roommate" | "other";
type StatusFilter = "all" | SupportRequestStatus;

type FormState = {
  title: string;
  content: string;
  targetRoomId: string;
  targetBedId: string;
  roomChangeReason: string;
  bedChangeReason: string;
  roommateCode: string;
  roommateName: string;
  roommateStudentId: string;
  roommateRoomId: string;
  roommateRoomName: string;
  roommateReason: string;
};

type FormProps = {
  form: FormState;
  updateField: (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  roommateLookupStatus: "idle" | "loading" | "found" | "missing" | "same_room";
  roomOptions: SelectOption[];
  bedOptions: SelectOption[];
  targetRoomBedOptions: SelectOption[];
  roommateBedOptions: SelectOption[];
  isLoadingRoomOptions: boolean;
};

type ToastState = {
  type: "success" | "error";
  message: string;
};

type SelectOption = {
  value: string;
  label: string;
  helper?: string;
};

const supportCategories: Array<{
  key: SupportCategory;
  label: string;
  description: string;
  Icon: LucideIcon;
}> = [
  { key: "room-change", label: "Đổi phòng", description: "Yêu cầu chuyển sang phòng phù hợp hơn.", Icon: ArrowRightLeft },
  { key: "bed-change", label: "Đổi giường", description: "Đổi giường trong phòng hoặc khu ở hiện tại.", Icon: BedSingle },
  { key: "roommate", label: "Bạn cùng phòng", description: "Đề xuất sinh viên muốn ở cùng phòng.", Icon: Handshake },
  { key: "other", label: "Hỗ trợ khác", description: "Góp ý, phản ánh hoặc yêu cầu hỗ trợ chung.", Icon: LifeBuoy },
];

const requestTypeLabels: Partial<Record<SupportRequestType, string>> = {
  room_change: "Đổi phòng",
  bed_change: "Đổi giường",
  roommate_request: "Bạn cùng phòng",
  complaint: "Khiếu nại",
  suggestion: "Góp ý",
  maintenance_report: "Báo cáo sửa chữa",
  other: "Hỗ trợ khác",
};

const formConfig: Record<
  SupportCategory,
  {
    title: string;
    subtitle: string;
    requestType: SupportRequestType;
    defaultTitle: string;
  }
> = {
  "room-change": {
    title: "Tạo yêu cầu đổi phòng",
    subtitle: "Kiểm tra thông tin lưu trú hiện tại và chọn phòng + giường mong muốn.",
    requestType: "room_change",
    defaultTitle: "Yêu cầu đổi phòng",
  },
  "bed-change": {
    title: "Tạo yêu cầu đổi giường",
    subtitle: "Kiểm tra phòng, giường hiện tại và chọn giường trống mong muốn.",
    requestType: "bed_change",
    defaultTitle: "Yêu cầu đổi giường",
  },
  roommate: {
    title: "Tạo yêu cầu bạn cùng phòng",
    subtitle: "Nhập MSSV sinh viên muốn ở cùng để hệ thống tự tìm thông tin.",
    requestType: "roommate_request",
    defaultTitle: "Yêu cầu bạn cùng phòng",
  },
  other: {
    title: "Tạo yêu cầu hỗ trợ khác",
    subtitle: "Mô tả nội dung cần hỗ trợ để ban quản lý phản hồi.",
    requestType: "other",
    defaultTitle: "Yêu cầu hỗ trợ",
  },
};

const initialForm: FormState = {
  title: "",
  content: "",
  targetRoomId: "",
  targetBedId: "",
  roomChangeReason: "",
  bedChangeReason: "",
  roommateCode: "",
  roommateName: "",
  roommateStudentId: "",
  roommateRoomId: "",
  roommateRoomName: "",
  roommateReason: "",
};

const statusMeta: Record<SupportRequestStatus, { label: string; className: string; Icon: LucideIcon }> = {
  pending: { label: "Chờ xử lý", className: "border-amber-200 bg-amber-50 text-amber-700", Icon: Clock3 },
  processing: { label: "Đang xử lý", className: "border-sky-200 bg-sky-50 text-sky-700", Icon: LifeBuoy },
  approved: { label: "Đã duyệt", className: "border-emerald-200 bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
  rejected: { label: "Từ chối", className: "border-rose-200 bg-rose-50 text-rose-700", Icon: XCircle },
  completed: { label: "Hoàn tất", className: "border-emerald-200 bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
};

const statusFilterValues: StatusFilter[] = ["all", "pending", "processing", "approved", "rejected", "completed"];

function normalizeStatusFilter(value: string | null): StatusFilter {
  return statusFilterValues.includes(value as StatusFilter) ? (value as StatusFilter) : "all";
}

const inferTypeLabel = (item: StudentSupportRequest) => {
  if (item.requestType in requestTypeLabels) {
    return requestTypeLabels[item.requestType] ?? "Hỗ trợ khác";
  }
  const title = item.title.toLowerCase();
  if (title.includes("đổi phòng")) return "Đổi phòng";
  if (title.includes("đổi giường")) return "Đổi giường";
  if (title.includes("gia hạn")) return "Gia hạn lưu trú";
  return "Hỗ trợ khác";
};

const formatDormRoomName = (room: DormRoom) => `${room.building_code}${room.room_number}`;

function StatusBadge({ status }: { status: SupportRequestStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.Icon;
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${meta.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function StudentSupportTableHead({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-4 text-center align-middle text-xs font-bold uppercase tracking-[0.1em] text-[#6f84ad] ${className}`}>{children}</th>;
}

function StudentSupportTableCell({ children }: { children: React.ReactNode }) {
  return <td className="border-t border-[#e8eef8] px-4 py-4 text-center align-middle">{children}</td>;
}

export default function StudentSupportPage() {
  const email = useAuthStore((state) => state.user?.email ?? "");
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<StudentSupportRequest[]>([]);
  const [selected, setSelected] = useState<StudentSupportRequest | null>(null);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [activeCreateType, setActiveCreateType] = useState<SupportCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [roommateLookupStatus, setRoommateLookupStatus] = useState<"idle" | "loading" | "found" | "missing" | "same_room">("idle");
  const [roommateTargetInfo, setRoommateTargetInfo] = useState<RoommateTargetInfo | null>(null);
  const [currentOccupancy, setCurrentOccupancy] = useState<MyRoom | null>(null);
  const [isLoadingOccupancy, setIsLoadingOccupancy] = useState(true);
  const [rooms, setRooms] = useState<DormRoom[]>([]);
  const [isLoadingRoomOptions, setIsLoadingRoomOptions] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);

  const loadItems = useCallback(async () => {
    if (!email) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setItems(await listMySupportRequests(email));
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!email) {
        setCurrentOccupancy(null);
        setRooms([]);
        setIsLoadingOccupancy(false);
        setIsLoadingRoomOptions(false);
        return;
      }
      setIsLoadingOccupancy(true);
      setIsLoadingRoomOptions(true);
      try {
        const [occupancy, roomData] = await Promise.all([getMyOccupancyFromBackend(email), getRooms()]);
        if (mounted) {
          setCurrentOccupancy(occupancy);
          setRooms(roomData);
        }
      } catch {
        if (mounted) {
          setCurrentOccupancy(null);
          setRooms([]);
        }
      } finally {
        if (mounted) {
          setIsLoadingOccupancy(false);
          setIsLoadingRoomOptions(false);
        }
      }
    };
    void load();
    return () => { mounted = false; };
  }, [email]);

  useEffect(() => {
    const code = form.roommateCode.trim();
    if (activeCreateType !== "roommate" || code.length < 4) {
      setRoommateLookupStatus("idle");
      setRoommateTargetInfo(null);
      setForm((cur) => {
        if (!cur.roommateName && !cur.roommateStudentId && !cur.roommateRoomId && !cur.roommateRoomName && !cur.targetRoomId && !cur.targetBedId) return cur;
        return {
          ...cur,
          roommateName: "",
          roommateStudentId: "",
          roommateRoomId: "",
          roommateRoomName: "",
          targetRoomId: "",
          targetBedId: "",
        };
      });
      return;
    }
    let mounted = true;
    setRoommateLookupStatus("loading");
    const timer = window.setTimeout(async () => {
      try {
        const result = await getRoommateTargetInfo(code);
        if (!mounted) return;
        const roomName = `${result.room.building_code}${result.room.room_number}`;
        setRoommateTargetInfo(result);
        setForm((cur) => ({
          ...cur,
          roommateName: result.student.full_name,
          roommateStudentId: String(result.student.id),
          roommateRoomId: String(result.room.id),
          roommateRoomName: roomName,
          targetRoomId: String(result.room.id),
          targetBedId: "",
        }));
        setRoommateLookupStatus(roomName === currentOccupancy?.roomCode ? "same_room" : "found");
      } catch {
        if (mounted) {
          setRoommateTargetInfo(null);
          setForm((cur) => ({
            ...cur,
            roommateName: "",
            roommateStudentId: "",
            roommateRoomId: "",
            roommateRoomName: "",
            targetRoomId: "",
            targetBedId: "",
          }));
          setRoommateLookupStatus("missing");
        }
      }
    }, 350);
    return () => { mounted = false; window.clearTimeout(timer); };
  }, [activeCreateType, form.roommateCode]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => normalizeStatusFilter(searchParams.get("status")));

  useEffect(() => {
    setStatusFilter(normalizeStatusFilter(searchParams.get("status")));
  }, [searchParams]);

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", value);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const summary = useMemo(() => ({
    total: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    processing: items.filter((i) => i.status === "processing").length,
    completed: items.filter((i) => i.status === "completed").length,
  }), [items]);

  const filteredItems = useMemo(
    () => statusFilter === "all" ? items : items.filter((i) => i.status === statusFilter),
    [items, statusFilter],
  );

  // Rooms available for room-change (other rooms with empty beds)
  const roomOptions = useMemo<SelectOption[]>(() => {
    const currentRoomCode = currentOccupancy?.roomCode;
    return rooms
      .filter((r) => formatDormRoomName(r) !== currentRoomCode)
      .filter((r) => r.availableBeds > 0)
      .sort((a, b) => formatDormRoomName(a).localeCompare(formatDormRoomName(b), "vi"))
      .map((r) => ({
        value: String(r.id),
        label: formatDormRoomName(r),
        helper: `${r.availableBeds}/${r.capacity ?? 0} giường trống`,
      }));
  }, [currentOccupancy?.roomCode, rooms]);

  // Beds in the selected target room (for room-change step 2)
  const targetRoomBedOptions = useMemo<SelectOption[]>(() => {
    if (!form.targetRoomId) return [];
    const room = rooms.find((r) => String(r.id) === form.targetRoomId);
    if (!room?.beds) return [];
    return room.beds
      .filter((b) => b.status === "active" && !b.occupied)
      .sort((a, b) => a.bed_number - b.bed_number)
      .map((b) => ({
        value: String(b.id),
        label: `Giường ${b.bed_number}`,
      }));
  }, [form.targetRoomId, rooms]);

  // Empty beds in current room (for bed-change)
  const bedOptions = useMemo<SelectOption[]>(() => {
    if (!currentOccupancy?.roomCode) return [];
    const currentRoom = rooms.find((r) => formatDormRoomName(r) === currentOccupancy.roomCode);
    if (!currentRoom?.beds) return [];
    return currentRoom.beds
      .filter((b) => b.status === "active" && !b.occupied)
      .sort((a, b) => a.bed_number - b.bed_number)
      .map((b) => ({
        value: String(b.id),
        label: `Giường ${b.bed_number}`,
      }));
  }, [currentOccupancy?.roomCode, rooms]);

  const roommateBedOptions = useMemo<SelectOption[]>(() => {
    if (!roommateTargetInfo) return [];
    return roommateTargetInfo.available_beds.map((bed) => ({
      value: String(bed.id),
      label: `Giường ${bed.bed_number}`,
    }));
  }, [roommateTargetInfo]);

  const openCreateModal = (type: SupportCategory) => {
    const config = formConfig[type];
    setIsTypeDialogOpen(false);
    setActiveCreateType(type);
    setForm({ ...initialForm, title: config.defaultTitle });
    setFormError("");
    setRoommateLookupStatus("idle");
    setRoommateTargetInfo(null);
  };

  const closeCreateModal = () => {
    if (isSubmitting) return;
    setActiveCreateType(null);
    setForm(initialForm);
    setFormError("");
    setRoommateLookupStatus("idle");
    setRoommateTargetInfo(null);
  };

  const updateField = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setForm((cur) => {
      if (field === "targetRoomId") {
        return { ...cur, targetRoomId: value, targetBedId: "" };
      }
      return { ...cur, [field]: value };
    });
  };

  const composeContent = (createType: SupportCategory) => {
    const currentLines = createType === "other" ? [] : getCurrentStayLines(currentOccupancy);

    if (createType === "room-change") {
      const targetRoom = rooms.find((r) => String(r.id) === form.targetRoomId);
      const targetRoomName = targetRoom ? formatDormRoomName(targetRoom) : "-";
      const targetBed = targetRoom?.beds?.find((b) => String(b.id) === form.targetBedId);
      const targetBedLabel = targetBed ? `Giường ${targetBed.bed_number}` : "-";
      return [
        ...currentLines,
        `Phòng mong muốn: ${targetRoomName}`,
        `Giường mong muốn: ${targetBedLabel}`,
        `Lý do: ${form.roomChangeReason || "-"}`,
      ].join("\n");
    }

    if (createType === "bed-change") {
      const currentRoom = rooms.find((r) => formatDormRoomName(r) === currentOccupancy?.roomCode);
      const targetBed = currentRoom?.beds?.find((b) => String(b.id) === form.targetBedId);
      const targetBedLabel = targetBed ? `Giường ${targetBed.bed_number}` : "-";
      return [
        ...currentLines,
        `Giường mong muốn: ${targetBedLabel}`,
        `Lý do: ${form.bedChangeReason || "-"}`,
      ].join("\n");
    }

    if (createType === "roommate") {
      const targetBed = roommateTargetInfo?.available_beds.find((b) => String(b.id) === form.targetBedId);
      const targetBedLabel = targetBed ? `Giường ${targetBed.bed_number}` : "-";
      return [
        ...currentLines,
        `MSSV sinh viên muốn ở cùng: ${form.roommateCode || "-"}`,
        `Họ tên: ${form.roommateName || "-"}`,
        `Phòng muốn ở cùng: ${form.roommateRoomName || "-"}`,
        `Giường mong muốn: ${targetBedLabel}`,
        `Lý do: ${form.roommateReason || "-"}`,
      ].join("\n");
    }

    return form.content.trim();
  };

  const isFormValid = (createType: SupportCategory) => {
    if (createType === "room-change") return Boolean(form.targetRoomId && form.targetBedId && form.roomChangeReason.trim());
    if (createType === "bed-change") return Boolean(form.targetBedId && form.bedChangeReason.trim());
    if (createType === "roommate") {
      if (roommateLookupStatus === "same_room") return false;
      return Boolean(
        form.roommateCode.trim() &&
        form.roommateStudentId &&
        form.roommateRoomId &&
        form.targetBedId &&
        form.roommateReason.trim(),
      );
    }
    return Boolean(form.title.trim() && form.content.trim());
  };

  const handleSubmitSupport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCreateType) return;

    setFormError("");

    if (!email) {
      setFormError("Không tìm thấy email sinh viên.");
      return;
    }

    if (!isFormValid(activeCreateType)) {
      setFormError("Vui lòng nhập đầy đủ thông tin yêu cầu.");
      return;
    }

    const config = formConfig[activeCreateType];

    setIsSubmitting(true);
    try {
      await createSupportRequest({
        email,
        request_type: config.requestType,
        title: form.title.trim() || config.defaultTitle,
        content: composeContent(activeCreateType),
        target_room_id:
          (activeCreateType === "room-change" || activeCreateType === "roommate") && form.targetRoomId
            ? parseInt(form.targetRoomId, 10)
            : undefined,
        target_bed_id:
          (activeCreateType === "room-change" || activeCreateType === "bed-change" || activeCreateType === "roommate") && form.targetBedId
            ? parseInt(form.targetBedId, 10)
            : undefined,
        target_student_id:
          activeCreateType === "roommate" && form.roommateStudentId
            ? parseInt(form.roommateStudentId, 10)
            : undefined,
      });
      setActiveCreateType(null);
      setForm(initialForm);
      setRoommateLookupStatus("idle");
      setRoommateTargetInfo(null);
      await loadItems();
      setToast({ type: "success", message: "Đã gửi yêu cầu hỗ trợ thành công." });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Không thể gửi yêu cầu hỗ trợ lúc này.";
      setFormError(msg);
      setToast({ type: "error", message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeConfig = activeCreateType ? formConfig[activeCreateType] : null;
  const SpecificForm = activeCreateType
    ? ({
        "room-change": RoomChangeForm,
        "bed-change": BedChangeForm,
        roommate: RoommateForm,
        other: OtherSupportForm,
      } as Record<SupportCategory, React.ComponentType<FormProps>>)[activeCreateType]
    : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-5 rounded-[24px] bg-[#eef3f8] p-4 sm:p-5"
    >
      <div className="rounded-[22px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_100%)] px-6 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Yêu cầu hỗ trợ</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#62789f]">
              Gửi yêu cầu đổi phòng, đổi giường, gia hạn lưu trú hoặc các hỗ trợ khác.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsTypeDialogOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#244cb8] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(36,76,184,0.22)] transition hover:bg-[#1d3f9c]"
          >
            <Plus className="h-4 w-4" />
            Tạo yêu cầu mới
          </button>
        </div>
      </div>

      <section className="rounded-[22px] border border-[#cbdcf2] bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.09)]">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#244cb8]" />
              <h2 className="text-lg font-bold text-[#1a2d52]">Lịch sử yêu cầu</h2>
            </div>
            <p className="text-sm font-semibold text-[#6f84ad]">{filteredItems.length}/{items.length} ticket</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              { value: "all",        label: "Tất cả",      count: items.length },
              { value: "pending",    label: "Chờ xử lý",   count: summary.pending },
              { value: "processing", label: "Đang xử lý",  count: summary.processing },
              { value: "completed",  label: "Hoàn tất",    count: summary.completed },
              { value: "approved",   label: "Đã duyệt",    count: items.filter((i) => i.status === "approved").length },
              { value: "rejected",   label: "Từ chối",     count: items.filter((i) => i.status === "rejected").length },
            ] as Array<{ value: StatusFilter; label: string; count: number }>)
              .filter((opt) => opt.value === "all" || opt.value === "rejected" || opt.count > 0)
              .map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusFilterChange(opt.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${
                    statusFilter === opt.value
                      ? "border-[#244cb8] bg-[#244cb8] text-white shadow-[0_4px_10px_rgba(36,76,184,0.2)]"
                      : "border-[#c8d8ef] bg-white text-[#5570a0] hover:border-[#9eb9e6] hover:bg-[#f0f6ff]"
                  }`}
                >
                  {opt.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${statusFilter === opt.value ? "bg-white/20 text-white" : "bg-[#eef3fb] text-[#244cb8]"}`}>
                    {opt.count}
                  </span>
                </button>
              ))}
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#e2eaf6] bg-[#f8fbff] px-4 py-4 text-sm font-semibold text-[#62789f]">
            Đang tải yêu cầu...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cbdcf2] bg-[#f8fbff] px-5 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf4ff] text-[#244cb8]">
              <LifeBuoy className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-extrabold text-[#1a2d52]">Bạn chưa gửi yêu cầu nào</h3>
            <p className="mx-auto mt-1 max-w-xl text-sm font-semibold leading-6 text-[#62789f]">
              Khi cần đổi phòng, đổi giường hoặc hỗ trợ khác hãy tạo yêu cầu mới.
            </p>
            <button
              type="button"
              onClick={() => setIsTypeDialogOpen(true)}
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#244cb8] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(36,76,184,0.20)]"
            >
              <Plus className="h-4 w-4" />
              Tạo yêu cầu đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#d6e2f1]">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                  <StudentSupportTableHead className="w-[32%]">Loại yêu cầu</StudentSupportTableHead>
                  <StudentSupportTableHead className="w-[22%]">Ngày gửi</StudentSupportTableHead>
                  <StudentSupportTableHead className="w-[24%]">Trạng thái</StudentSupportTableHead>
                  <StudentSupportTableHead className="w-[22%]">Hành động</StudentSupportTableHead>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm font-semibold text-[#6f84ad]">
                      Không có yêu cầu nào ở trạng thái này.
                    </td>
                  </tr>
                ) : filteredItems.map((item) => (
                    <tr key={item.id} className="transition hover:bg-[#f8fbff]">
                      <StudentSupportTableCell>
                        <span className="mx-auto line-clamp-2 max-w-[220px] text-sm font-bold leading-5 text-[#1f3152]">{inferTypeLabel(item)}</span>
                      </StudentSupportTableCell>
                      <StudentSupportTableCell>
                        <span className="text-sm font-bold text-[#62789f]">{formatDate(item.createdAt)}</span>
                      </StudentSupportTableCell>
                      <StudentSupportTableCell>
                        <div className="flex justify-center">
                          <StatusBadge status={item.status} />
                        </div>
                      </StudentSupportTableCell>
                      <StudentSupportTableCell>
                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#bfd2ec] bg-white px-3 text-xs font-bold text-[#244cb8] transition hover:border-[#9ebce5] hover:bg-[#eef5ff]"
                        >
                          <Eye className="h-4 w-4" />
                          Xem chi tiết
                        </button>
                      </StudentSupportTableCell>
                    </tr>
                  ))}
              </tbody>
            </table>

            {selected ? (
              <div className="hidden border-t border-[#dbe6f5] bg-[#f8fbff] px-4 py-4">
                <div className="grid gap-2 md:grid-cols-2">
                  <p className="whitespace-pre-line text-sm font-semibold leading-6 text-[#62789f] md:col-span-2">{selected?.content}</p>
                  <p className="text-sm text-[#5570a0]">
                    Phản hồi: <span className="font-semibold text-[#1b3766]">{selected.adminNote || "Chưa có phản hồi."}</span>
                  </p>
                  <p className="text-sm text-[#5570a0]">
                    Cập nhật: <span className="font-semibold text-[#1b3766]">{formatDate(selected.updatedAt || selected.createdAt)}</span>
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {selected ? <StudentRequestDetailModal item={selected} onClose={() => setSelected(null)} /> : null}

      {/* Category picker dialog */}
      {isTypeDialogOpen
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="w-full max-w-4xl rounded-[28px] border border-[#bfd4f2] bg-white p-5 shadow-[0_28px_70px_rgba(27,56,122,0.28)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#1a2d52]">Tạo yêu cầu hỗ trợ</h2>
                    <p className="mt-1 text-sm font-semibold text-[#62789f]">Chọn loại yêu cầu cần gửi.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTypeDialogOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#bfd2ee] bg-white text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                    aria-label="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {supportCategories.map(({ key, label, description, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => openCreateModal(key)}
                      className="group min-h-[132px] rounded-2xl border border-[#d8e3f1] bg-white p-4 text-left shadow-[0_10px_22px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-[#f8fbff]"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf4ff] text-[#244cb8] transition group-hover:bg-[#244cb8] group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <p className="mt-3 text-sm font-extrabold text-[#1a2d52]">{label}</p>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#6f84ad]">{description}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>,
            document.body,
          )
        : null}

      {/* Create form modal */}
      {activeCreateType && activeConfig && SpecificForm
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 py-6 backdrop-blur-sm">
              <motion.form
                onSubmit={handleSubmitSupport}
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-[#bfd4f2] bg-white shadow-[0_28px_70px_rgba(27,56,122,0.28)]"
              >
                <div className="flex items-start justify-between gap-4 border-b border-[#e3ebf7] px-5 py-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#1a2d52]">{activeConfig.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-[#62789f]">{activeConfig.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#bfd2ee] bg-white text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                    aria-label="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto px-5 py-5">
                  {activeCreateType !== "other" ? (
                    <CurrentStayCard occupancy={currentOccupancy} isLoading={isLoadingOccupancy} />
                  ) : null}

                  <section className="rounded-2xl border border-[#d8e3f1] bg-[#f8fbff] p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[#244cb8]" />
                      <h3 className="text-base font-bold text-[#1a2d52]">Thông tin yêu cầu</h3>
                    </div>
                    <div className="space-y-4">
                      <SpecificForm
                        form={form}
                        updateField={updateField}
                        roommateLookupStatus={roommateLookupStatus}
                        roomOptions={roomOptions}
                        bedOptions={bedOptions}
                        targetRoomBedOptions={targetRoomBedOptions}
                        roommateBedOptions={roommateBedOptions}
                        isLoadingRoomOptions={isLoadingRoomOptions}
                      />
                    </div>
                  </section>

                  {formError ? <p className="text-sm font-semibold text-[#c4364f]">{formError}</p> : null}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-[#e3ebf7] px-5 py-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#c8d8ef] bg-white px-5 text-sm font-bold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition hover:bg-[#f5f9ff]"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#244cb8] px-6 text-sm font-bold text-white shadow-[0_12px_24px_rgba(36,76,184,0.22)] transition hover:bg-[#1d3f9c] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Send className="h-4 w-4" />
                    {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
                  </button>
                </div>
              </motion.form>
            </div>,
            document.body,
          )
        : null}

      {toast
        ? createPortal(
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`fixed right-5 top-5 z-[100] rounded-2xl border px-4 py-3 text-sm font-bold shadow-[0_16px_34px_rgba(15,23,42,0.18)] ${
                toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {toast.message}
            </motion.div>,
            document.body,
          )
        : null}
    </motion.section>
  );
}

// ── Sub-forms ─────────────────────────────────────────────────────────────────

function StudentRequestDetailModal({ item, onClose }: { item: StudentSupportRequest; onClose: () => void }) {
  const targetRoomLabel = item.targetRoom ? `${item.targetRoom.buildingCode}${item.targetRoom.roomNumber}` : "";
  const targetBedLabel = item.targetBed ? `Giường ${item.targetBed.bedNumber}` : "";

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 py-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-[#bfd4f2] bg-white shadow-[0_28px_70px_rgba(27,56,122,0.28)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e3ebf7] px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">Chi tiết yêu cầu</p>
            <h2 className="mt-1 text-xl font-extrabold text-[#1a2d52]">{item.title || inferTypeLabel(item)}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#bfd2ee] bg-white text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-5">
          <section className="grid gap-3 rounded-2xl border border-[#d8e3f1] bg-[#f8fbff] p-4 sm:grid-cols-2">
            <DetailInfoRow label="Loại yêu cầu" value={inferTypeLabel(item)} />
            <DetailInfoRow label="Ngày gửi" value={formatDate(item.createdAt)} />
            <div className="sm:col-span-2">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6f84ad]">Trạng thái</p>
              <div className="mt-1.5">
                <StatusBadge status={item.status} />
              </div>
            </div>
          </section>

          {targetRoomLabel || targetBedLabel || item.targetStudent ? (
            <section className="grid gap-3 rounded-2xl border border-[#d8e3f1] bg-white p-4 sm:grid-cols-2">
              {item.targetStudent ? <DetailInfoRow label="Sinh viên muốn ở cùng" value={`${item.targetStudent.fullName} (${item.targetStudent.studentCode})`} /> : null}
              {targetRoomLabel ? <DetailInfoRow label="Phòng đích" value={targetRoomLabel} /> : null}
              {targetBedLabel ? <DetailInfoRow label="Giường đích" value={targetBedLabel} /> : null}
            </section>
          ) : null}

          <section className="rounded-2xl border border-[#d8e3f1] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6f84ad]">Nội dung yêu cầu</p>
            <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-6 text-[#1b3766]">{item.content || "-"}</p>
          </section>

          <section className="grid gap-3 rounded-2xl border border-[#d8e3f1] bg-[#f8fbff] p-4 sm:grid-cols-2">
            <DetailInfoRow label="Phản hồi" value={item.adminNote || "Chưa có phản hồi."} />
            <DetailInfoRow label="Cập nhật" value={formatDate(item.updatedAt || item.createdAt)} />
          </section>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

function DetailInfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6f84ad]">{label}</p>
      <p className="mt-1.5 whitespace-pre-line text-sm font-bold leading-6 text-[#1b3766]">{value || "-"}</p>
    </div>
  );
}

function RoomChangeForm(props: FormProps) {
  return (
    <>
      <SelectField
        label="Phòng mong muốn"
        value={props.form.targetRoomId}
        onChange={props.updateField("targetRoomId")}
        options={props.roomOptions}
        placeholder={props.isLoadingRoomOptions ? "Đang tải danh sách phòng..." : "Chọn phòng còn giường trống"}
        emptyText="Hiện chưa có phòng khác còn giường trống."
        disabled={props.isLoadingRoomOptions}
      />
      {props.form.targetRoomId ? (
        <SelectField
          label="Giường mong muốn trong phòng đã chọn"
          value={props.form.targetBedId}
          onChange={props.updateField("targetBedId")}
          options={props.targetRoomBedOptions}
          placeholder="Chọn giường trống"
          emptyText="Phòng này không còn giường trống."
          disabled={props.targetRoomBedOptions.length === 0}
        />
      ) : null}
      <TextAreaField label="Lý do" value={props.form.roomChangeReason} onChange={props.updateField("roomChangeReason")} rows={4} />
    </>
  );
}

function BedChangeForm(props: FormProps) {
  return (
    <>
      <SelectField
        label="Giường mong muốn"
        value={props.form.targetBedId}
        onChange={props.updateField("targetBedId")}
        options={props.bedOptions}
        placeholder={props.isLoadingRoomOptions ? "Đang tải danh sách giường..." : "Chọn giường trống trong phòng hiện tại"}
        emptyText="Phòng hiện tại không còn giường trống khác."
        disabled={props.isLoadingRoomOptions || props.bedOptions.length === 0}
      />
      <TextAreaField label="Lý do" value={props.form.bedChangeReason} onChange={props.updateField("bedChangeReason")} rows={4} />
    </>
  );
}

function RoommateForm(props: FormProps) {
  return (
    <>
      <TextField label="MSSV sinh viên muốn ở cùng" value={props.form.roommateCode} onChange={props.updateField("roommateCode")} />
      <label className="block">
        <span className="text-sm font-bold text-[#526a96]">Họ tên</span>
        <input
          value={props.form.roommateName}
          readOnly
          placeholder={props.roommateLookupStatus === "loading" ? "Đang tìm..." : "Tự động tìm theo MSSV"}
          className="mt-1.5 h-11 w-full rounded-2xl border border-[#d6e2f1] bg-[#eef4fb] px-3 text-sm font-semibold text-[#1f3152] outline-none"
        />
        {props.roommateLookupStatus === "missing" && <p className="mt-1 text-xs font-semibold text-[#c4364f]">Không tìm thấy sinh viên.</p>}
        {props.roommateLookupStatus === "same_room" && <p className="mt-1 text-xs font-semibold text-[#c4364f]">Sinh viên này đã ở cùng phòng với bạn. Dùng yêu cầu đổi giường nếu cần.</p>}
      </label>
      {props.roommateLookupStatus === "found" ? (
        <>
          <ReadOnlyInfo label="Phòng của sinh viên muốn ở cùng" value={props.form.roommateRoomName} />
          <SelectField
            label="Giường trống trong phòng đó"
            value={props.form.targetBedId}
            onChange={props.updateField("targetBedId")}
            options={props.roommateBedOptions}
            placeholder="Chọn giường trống"
            emptyText="Phòng này không còn giường trống."
            disabled={props.roommateBedOptions.length === 0}
          />
          {props.roommateBedOptions.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              Phòng của sinh viên này hiện không còn giường trống để gửi yêu cầu ở cùng.
            </p>
          ) : null}
        </>
      ) : null}
      <TextAreaField label="Lý do" value={props.form.roommateReason} onChange={props.updateField("roommateReason")} rows={4} />
    </>
  );
}

function OtherSupportForm(props: FormProps) {
  return (
    <>
      <TextField label="Tiêu đề" value={props.form.title} onChange={props.updateField("title")} />
      <TextAreaField label="Nội dung" value={props.form.content} onChange={props.updateField("content")} rows={6} />
    </>
  );
}

// ── Shared widgets ────────────────────────────────────────────────────────────

function CurrentStayCard({ occupancy, isLoading }: { occupancy: MyRoom | null; isLoading: boolean }) {
  return (
    <section className="rounded-2xl border border-[#d8e3f1] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-[#1a2d52]">Thông tin lưu trú hiện tại</h3>
        <p className="text-sm font-semibold text-[#6f84ad]">Thông tin này chỉ dùng để đối chiếu trước khi gửi yêu cầu.</p>
      </div>
      {isLoading ? (
        <div className="mt-4 rounded-xl border border-[#d8e3f1] bg-white px-4 py-3 text-sm font-semibold text-[#62789f]">
          Đang tải thông tin lưu trú...
        </div>
      ) : occupancy ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ReadOnlyInfo label="Phòng hiện tại" value={occupancy.roomCode} />
          <ReadOnlyInfo label="Giường hiện tại" value={`Giường ${occupancy.bedNumber}`} />
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          Chưa tìm thấy thông tin lưu trú hiện tại.
        </div>
      )}
    </section>
  );
}

function ReadOnlyInfo({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#6f84ad]">{label}</span>
      <input
        value={value || "-"}
        readOnly
        className="mt-1.5 h-11 w-full rounded-2xl border border-[#d6e2f1] bg-white px-3 text-sm font-bold text-[#1f3152] outline-none"
      />
    </label>
  );
}

function getCurrentStayLines(occupancy: MyRoom | null) {
  return [
    "Thông tin lưu trú hiện tại:",
    `Phòng hiện tại: ${occupancy?.roomCode || "-"}`,
    `Giường hiện tại: ${occupancy?.bedNumber ? `Giường ${occupancy.bedNumber}` : "-"}`,
    "Thông tin yêu cầu:",
  ];
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  emptyText,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  placeholder: string;
  emptyText: string;
  disabled?: boolean;
}) {
  const hasOptions = options.length > 0;
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#526a96]">{label}</span>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled || !hasOptions}
        className="mt-1.5 h-11 w-full rounded-2xl border border-[#d6e2f1] bg-white px-3 text-sm font-semibold text-[#1f3152] outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12 disabled:cursor-not-allowed disabled:bg-[#eef4fb] disabled:text-[#7d8fb0]"
      >
        <option value="">{hasOptions ? placeholder : emptyText}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.helper ? `${opt.label} - ${opt.helper}` : opt.label}
          </option>
        ))}
      </select>
      {!disabled && !hasOptions ? <p className="mt-1 text-xs font-semibold text-amber-700">{emptyText}</p> : null}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#526a96]">{label}</span>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1.5 h-11 w-full rounded-2xl border border-[#d6e2f1] bg-white px-3 text-sm font-semibold text-[#1f3152] outline-none placeholder:text-[#8da0bf] focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#526a96]">{label}</span>
      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        className="mt-1.5 w-full resize-none rounded-2xl border border-[#d6e2f1] bg-white px-3 py-3 text-sm font-semibold text-[#1f3152] outline-none placeholder:text-[#8da0bf] focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12"
      />
    </label>
  );
}
