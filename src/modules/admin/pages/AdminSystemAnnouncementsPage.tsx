import { motion } from "framer-motion";
import {
  ArrowLeft,
  BellRing,
  CalendarX,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createSystemAnnouncement,
  deleteSystemAnnouncement,
  getAnnouncementTargetOptions,
  getSystemAnnouncement,
  getSystemAnnouncementStats,
  listSystemAnnouncements,
  resendSystemAnnouncementEmail,
  sendSystemAnnouncement,
  unscheduleSystemAnnouncement,
  updateSystemAnnouncement,
  type AnnouncementPayload,
  type AnnouncementPriority,
  type AnnouncementStatus,
  type AnnouncementTargetOptions,
  type AnnouncementTargetType,
  type AnnouncementType,
  type SystemAnnouncement,
  type SystemAnnouncementStats,
} from "../../../api/systemAnnouncementApi";
import { searchStudentsForOccupancy, type StudentSearchResult } from "../../../api/studentSearchApi";

type FormState = {
  title: string;
  content: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  target_type: AnnouncementTargetType;
  target_value: string;
  selected_students: StudentSearchResult[];
  send_web: boolean;
  send_email: boolean;
  send_mode: "now" | "schedule";
  scheduled_at: string;
};

type AnnouncementFieldKey = "title" | "content" | "channels" | "target_value" | "selected_students" | "scheduled_at";
type AnnouncementFormErrors = Partial<Record<AnnouncementFieldKey, string>>;

const emptyForm: FormState = {
  title: "",
  content: "",
  type: "general",
  priority: "normal",
  target_type: "active_students",
  target_value: "",
  selected_students: [],
  send_web: true,
  send_email: false,
  send_mode: "now",
  scheduled_at: "",
};

const typeMeta: Record<AnnouncementType, { label: string; className: string }> = {
  general: { label: "Thông báo chung", className: "border-blue-200 bg-blue-50 text-blue-700" },
  warning: { label: "Cảnh cáo", className: "border-orange-200 bg-orange-50 text-orange-700" },
  urgent: { label: "Khẩn cấp", className: "border-red-200 bg-red-50 text-red-700" },
  reminder: { label: "Nhắc nhở", className: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  policy: { label: "Nội quy", className: "border-violet-200 bg-violet-50 text-violet-700" },
};

const statusMeta: Record<AnnouncementStatus, { label: string; className: string }> = {
  draft: { label: "Nháp", className: "border-slate-200 bg-slate-50 text-slate-700" },
  scheduled: { label: "Hẹn giờ", className: "border-sky-200 bg-sky-50 text-sky-700" },
  sending: { label: "Đang gửi", className: "border-blue-200 bg-blue-50 text-blue-700" },
  sent: { label: "Đã gửi", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  failed: { label: "Lỗi", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

const priorityOptions: Array<{ value: AnnouncementPriority; label: string }> = [
  { value: "normal", label: "Bình thường" },
  { value: "important", label: "Quan trọng" },
  { value: "urgent", label: "Khẩn cấp" },
];

const typeOptions = Object.entries(typeMeta).map(([value, meta]) => ({ value: value as AnnouncementType, label: meta.label }));

const inputClass =
  "w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#1f3152] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${className}`}>{children}</span>;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function toLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === "string" ? message : fallback;
}

function recipientToStudent(recipient: NonNullable<SystemAnnouncement["recipients"]>[number]): StudentSearchResult {
  return {
    id: recipient.student_id,
    full_name: recipient.full_name || "",
    student_code: recipient.student_code || "",
    avatar_url: null,
    room_number: recipient.room,
    building_code: null,
    faculty: null,
    current_year: null,
    occupancy_status: null,
    occupancy_id: null,
    bed_number: null,
    check_out_date: null,
    registration_id: null,
  };
}

export default function AdminSystemAnnouncementsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const announcementId = id ? Number(id) : null;
  const isCreate = location.pathname.endsWith("/create");
  const isEdit = location.pathname.endsWith("/edit");
  const isDetail = Boolean(announcementId) && !isEdit;

  if (isCreate || isEdit) {
    return <AnnouncementForm announcementId={announcementId} onDone={(nextId) => navigate(`/admin/content/announcements/${nextId}`)} />;
  }

  if (isDetail && announcementId) {
    return <AnnouncementDetail id={announcementId} />;
  }

  return <AnnouncementList />;
}

function AnnouncementList() {
  const [items, setItems] = useState<SystemAnnouncement[]>([]);
  const [stats, setStats] = useState<SystemAnnouncementStats>({ total: 0, draft: 0, scheduled: 0, sent: 0, failed: 0 });
  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const summaryCards: Array<{
    label: string;
    value: number;
    valueClassName: string;
    delay: number;
    filterValue: AnnouncementStatus | "all";
  }> = [
    {
      label: "Tổng thông báo",
      value: stats.total,
      valueClassName: "text-[#244cb8]",
      delay: 0.12,
      filterValue: "all",
    },
    {
      label: "Đã gửi",
      value: stats.sent,
      valueClassName: "text-[#16784b]",
      delay: 0.18,
      filterValue: "sent",
    },
    {
      label: "Nháp",
      value: stats.draft,
      valueClassName: "text-[#667085]",
      delay: 0.24,
      filterValue: "draft",
    },
    {
      label: "Hẹn giờ",
      value: stats.scheduled,
      valueClassName: "text-[#244cb8]",
      delay: 0.3,
      filterValue: "scheduled",
    },
    {
      label: "Lỗi",
      value: stats.failed,
      valueClassName: "text-[#c03434]",
      delay: 0.36,
      filterValue: "failed",
    },
  ];

  const load = async (nextPage = page) => {
    setLoading(true);
    setError("");
    try {
      const [list, nextStats] = await Promise.all([
        listSystemAnnouncements({ status: statusFilter, page: nextPage, per_page: 10 }),
        getSystemAnnouncementStats(),
      ]);
      setItems(list.data);
      setLastPage(list.meta.last_page);
      setStats(nextStats);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải danh sách thông báo."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  const handleSummaryCardClick = (filterValue: AnnouncementStatus | "all") => {
    setPage(1);
    setStatusFilter((current) => (current === filterValue ? "all" : filterValue));
  };

  const handleDelete = async (item: SystemAnnouncement) => {
    if (item.status !== "draft") return;
    if (!window.confirm("Xóa thông báo nháp này?")) return;
    try {
      await deleteSystemAnnouncement(item.id);
      void load();
    } catch (err) {
      setError(getErrorMessage(err, "Không thể xóa thông báo."));
    }
  };

  const handleSend = async (item: SystemAnnouncement) => {
    try {
      await sendSystemAnnouncement(item.id);
      void load();
    } catch (err) {
      setError(getErrorMessage(err, "Không thể gửi thông báo."));
    }
  };

  const handleResendEmail = async (item: SystemAnnouncement) => {
    try {
      await resendSystemAnnouncementEmail(item.id);
      void load();
    } catch (err) {
      setError(getErrorMessage(err, "Không thể gửi lại email."));
    }
  };

  const handleUnschedule = async (item: SystemAnnouncement) => {
    if (!window.confirm("Hủy hẹn giờ và chuyển thông báo này về nháp?")) return;
    try {
      await unscheduleSystemAnnouncement(item.id);
      void load();
    } catch (err) {
      setError(getErrorMessage(err, "Không thể hủy hẹn giờ."));
    }
  };

  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6">
      <div className="flex flex-col gap-4 rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#1a2d52] sm:text-[28px]">Quản lý thông báo</h1>
          <p className="mt-1 text-sm text-[#62789f]">Tạo và gửi thông báo đến sinh viên qua web và email.</p>
        </div>
        <Link to="/admin/content/announcements/create" className={`${buttonClass} bg-[#244cb8] text-white shadow-[0_12px_24px_rgba(36,76,184,0.22)]`}>
          <Plus className="h-4 w-4" />
          Tạo thông báo
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {summaryCards.map((card) => {
          const isActive = statusFilter === card.filterValue;

          return (
            <motion.article
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: card.delay, ease: "easeOut" }}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              onClick={() => handleSummaryCardClick(card.filterValue)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleSummaryCardClick(card.filterValue);
                }
              }}
              className={`flex cursor-pointer flex-col items-center rounded-[24px] border px-5 py-4 text-center shadow-[0_14px_30px_rgba(36,76,184,0.08)] outline-none transition focus-visible:ring-4 focus-visible:ring-[#244cb8]/25 ${
                isActive
                  ? "border-[#244cb8] bg-[#244cb8]/5"
                  : "border-[#d8e4f5] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)]"
              }`}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7c8fb5]">
                {card.label}
              </p>
              <p className={`mt-3 text-[2rem] font-extrabold leading-none ${card.valueClassName}`}>
                {card.value}
              </p>
            </motion.article>
          );
        })}
      </div>

      <div className="rounded-[20px] border border-[#d6e2f1] bg-white p-4 shadow-[0_12px_28px_rgba(36,76,184,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.08em] text-[#6f84ad]">
                <th className="w-[26%] border-b border-[#e5edf8] px-3 py-3">Tiêu đề</th>
                <th className="w-[13%] border-b border-[#e5edf8] px-3 py-3">Loại</th>
                <th className="w-[17%] border-b border-[#e5edf8] px-3 py-3">Đối tượng</th>
                <th className="w-[11%] border-b border-[#e5edf8] px-3 py-3">Kênh gửi</th>
                <th className="w-[12%] border-b border-[#e5edf8] px-3 py-3">Trạng thái</th>
                <th className="w-[11%] border-b border-[#e5edf8] px-3 py-3">Ngày gửi</th>
                <th className="w-[10%] border-b border-[#e5edf8] px-3 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-[#6f84ad]"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-rose-600">{error}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-[#6f84ad]">Chưa có thông báo.</td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className="text-[#1f3152]">
                  <td className="border-b border-[#eef3fb] px-3 py-4">
                    <p className="line-clamp-2 font-bold">{item.title}</p>
                  </td>
                  <td className="border-b border-[#eef3fb] px-3 py-4"><Badge className={typeMeta[item.type].className}>{typeMeta[item.type].label}</Badge></td>
                  <td className="border-b border-[#eef3fb] px-3 py-4"><span className="line-clamp-2">{item.target_label}</span></td>
                  <td className="border-b border-[#eef3fb] px-3 py-4">{[item.send_web ? "Web" : null, item.send_email ? "Email" : null].filter(Boolean).join(", ")}</td>
                  <td className="border-b border-[#eef3fb] px-3 py-4"><Badge className={statusMeta[item.status].className}>{statusMeta[item.status].label}</Badge></td>
                  <td className="border-b border-[#eef3fb] px-3 py-4">{formatDateOnly(item.sent_at || item.scheduled_at || item.created_at)}</td>
                  <td className="border-b border-[#eef3fb] px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/admin/content/announcements/${item.id}`} className="inline-flex items-center gap-1 rounded-xl bg-[#eef5ff] px-2.5 py-2 text-xs font-bold text-[#244cb8]" title="Xem chi tiết"><Eye className="h-4 w-4" />Chi tiết</Link>
                      {(item.status === "draft" || item.status === "scheduled") && <Link to={`/admin/content/announcements/${item.id}/edit`} className="rounded-xl bg-[#eef5ff] p-2 text-[#244cb8]" title="Chỉnh sửa"><Pencil className="h-4 w-4" /></Link>}
                      {item.status === "scheduled" && <button type="button" onClick={() => void handleUnschedule(item)} className="rounded-xl bg-slate-100 p-2 text-slate-600" title="Hủy hẹn giờ"><CalendarX className="h-4 w-4" /></button>}
                      {item.status === "draft" && <button type="button" onClick={() => void handleSend(item)} className="rounded-xl bg-emerald-50 p-2 text-emerald-700" title="Gửi"><Send className="h-4 w-4" /></button>}
                      {item.status === "sent" && item.email_failed_count > 0 && <button type="button" onClick={() => void handleResendEmail(item)} className="rounded-xl bg-amber-50 p-2 text-amber-700" title="Gửi lại email"><RotateCcw className="h-4 w-4" /></button>}
                      {item.status === "draft" && <button type="button" onClick={() => void handleDelete(item)} className="rounded-xl bg-rose-50 p-2 text-rose-700" title="Xóa"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className={`${buttonClass} bg-[#eef5ff] text-[#24407f]`}>Trước</button>
          <span className="text-sm font-semibold text-[#6f84ad]">{page}/{lastPage}</span>
          <button type="button" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} className={`${buttonClass} bg-[#eef5ff] text-[#24407f]`}>Sau</button>
        </div>
      </div>
    </motion.section>
  );
}

function AnnouncementForm({ announcementId, onDone }: { announcementId: number | null; onDone: (id: number) => void }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [options, setOptions] = useState<AnnouncementTargetOptions>({ buildings: [], floors: [], rooms: [] });
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<StudentSearchResult[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(Boolean(announcementId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AnnouncementFormErrors>({});
  const fieldRefs = useRef<Record<AnnouncementFieldKey, HTMLDivElement | null>>({
    title: null,
    content: null,
    channels: null,
    target_value: null,
    selected_students: null,
    scheduled_at: null,
  });
  const isEdit = Boolean(announcementId);

  const setFieldRef = (field: AnnouncementFieldKey) => (node: HTMLDivElement | null) => {
    fieldRefs.current[field] = node;
  };

  const clearFieldError = (field: AnnouncementFieldKey) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const scrollToField = (field: AnnouncementFieldKey) => {
    window.setTimeout(() => {
      fieldRefs.current[field]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };

  useEffect(() => {
    getAnnouncementTargetOptions()
      .then(setOptions)
      .catch((err) => setError(getErrorMessage(err, "Không thể tải dữ liệu chọn đối tượng nhận.")));
  }, []);

  useEffect(() => {
    if (!announcementId) return;
    setLoading(true);
    setError("");
    getSystemAnnouncement(announcementId)
      .then((item) => {
        const selectedStudents = item.target_type === "students"
          ? (item.recipients ?? []).map(recipientToStudent)
          : [];
        setForm({
          title: item.title,
          content: item.content,
          type: item.type,
          priority: item.priority,
          target_type: item.target_type,
          target_value: Array.isArray(item.target_value) ? "" : String(item.target_value ?? ""),
          selected_students: selectedStudents,
          send_web: item.send_web,
          send_email: item.send_email,
          send_mode: item.status === "scheduled" || item.scheduled_at ? "schedule" : "now",
          scheduled_at: toLocalInput(item.scheduled_at),
        });
      })
      .catch((err) => setError(getErrorMessage(err, "Không thể tải thông báo.")))
      .finally(() => setLoading(false));
  }, [announcementId]);

  useEffect(() => {
    if (studentQuery.trim().length < 2) {
      setStudentResults([]);
      return;
    }
    const id = window.setTimeout(() => {
      searchStudentsForOccupancy(studentQuery, 10).then(setStudentResults).catch(() => setStudentResults([]));
    }, 250);
    return () => window.clearTimeout(id);
  }, [studentQuery]);

  const payload = (action: "draft" | "send" | "schedule"): AnnouncementPayload => ({
    title: form.title.trim(),
    content: form.content.trim(),
    type: form.type,
    priority: form.priority,
    target_type: form.target_type,
    target_value: form.target_type === "students"
      ? form.selected_students.map((student) => student.id)
      : form.target_type === "active_students"
        ? null
        : form.target_value,
    send_web: form.send_web,
    send_email: form.send_email,
    scheduled_at: form.send_mode === "schedule" ? form.scheduled_at : null,
    action,
  });

  const validateForm = (action: "draft" | "send" | "schedule") => {
    const nextErrors: AnnouncementFormErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = "Vui lòng nhập tiêu đề.";
    }
    if (!form.content.trim()) {
      nextErrors.content = "Vui lòng nhập nội dung.";
    }
    if (!form.send_web && !form.send_email) {
      nextErrors.channels = "Vui lòng chọn ít nhất một kênh gửi.";
    }
    if (["building", "floor", "room"].includes(form.target_type) && !form.target_value) {
      nextErrors.target_value = "Vui lòng chọn đối tượng nhận.";
    }
    if (form.target_type === "students" && form.selected_students.length === 0) {
      nextErrors.selected_students = "Vui lòng chọn sinh viên nhận thông báo.";
    }
    if (action === "schedule" && !form.scheduled_at) {
      nextErrors.scheduled_at = "Vui lòng chọn thời gian gửi.";
    }

    setFieldErrors(nextErrors);
    setError("");

    const firstErrorField = (["title", "target_value", "selected_students", "channels", "content", "scheduled_at"] as AnnouncementFieldKey[])
      .find((field) => nextErrors[field]);

    if (firstErrorField) {
      scrollToField(firstErrorField);
      return false;
    }

    return true;
  };

  const submit = async (action: "draft" | "send" | "schedule") => {
    if (!validateForm(action)) return;
    setSaving(true);
    setError("");
    try {
      const result = announcementId
        ? await updateSystemAnnouncement(announcementId, payload(action))
        : await createSystemAnnouncement(payload(action));
      onDone(result.id);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể lưu thông báo."));
    } finally {
      setSaving(false);
    }
  };

  const addStudent = (student: StudentSearchResult) => {
    setForm((current) => current.selected_students.some((item) => item.id === student.id)
      ? current
      : { ...current, selected_students: [...current.selected_students, student] });
    clearFieldError("selected_students");
    setStudentQuery("");
    setStudentResults([]);
  };

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#244cb8]" /></div>;
  }

  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6">
      <div className="flex items-center justify-between rounded-[20px] border border-[#c1d6f4] bg-white px-6 py-5 shadow-[0_12px_28px_rgba(36,76,184,0.08)]">
        <div>
          <Link to="/admin/content/announcements" className="inline-flex items-center gap-2 text-sm font-bold text-[#5470a6]"><ArrowLeft className="h-4 w-4" />Quay lại</Link>
          <h1 className="mt-2 text-[24px] font-bold text-[#1a2d52]">{isEdit ? "Chỉnh sửa thông báo" : "Tạo thông báo"}</h1>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5 rounded-[20px] border border-[#d6e2f1] bg-white p-5 shadow-[0_12px_28px_rgba(36,76,184,0.08)]">
          <div ref={setFieldRef("title")}>
            <Field label="Tiêu đề *" error={fieldErrors.title}><input className={inputClass} value={form.title} onChange={(e) => { setForm({ ...form, title: e.target.value }); clearFieldError("title"); }} /></Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Loại thông báo">
              <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AnnouncementType })}>
                {typeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </Field>
            <Field label="Mức độ">
              <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as AnnouncementPriority })}>
                {priorityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Đối tượng nhận">
            <select className={inputClass} value={form.target_type} onChange={(e) => { setForm({ ...form, target_type: e.target.value as AnnouncementTargetType, target_value: "", selected_students: [] }); clearFieldError("target_value"); clearFieldError("selected_students"); }}>
              <option value="active_students">Tất cả sinh viên đang ở KTX</option>
              <option value="building">Theo tòa</option>
              <option value="floor">Theo tầng</option>
              <option value="room">Theo phòng</option>
              <option value="students">Theo sinh viên cụ thể</option>
            </select>
          </Field>

          {form.target_type === "building" && <div ref={setFieldRef("target_value")}><Field label="Tòa" error={fieldErrors.target_value}><select className={inputClass} value={form.target_value} onChange={(e) => { setForm({ ...form, target_value: e.target.value }); clearFieldError("target_value"); }}><option value="">Chọn tòa</option>{options.buildings.map((item) => <option key={item.building_code} value={item.building_code}>{item.name || `Tòa ${item.building_code}`}</option>)}</select></Field></div>}
          {form.target_type === "floor" && <div ref={setFieldRef("target_value")}><Field label="Tầng" error={fieldErrors.target_value}><select className={inputClass} value={form.target_value} onChange={(e) => { setForm({ ...form, target_value: e.target.value }); clearFieldError("target_value"); }}><option value="">Chọn tầng</option>{options.floors.map((item) => <option key={item.id} value={item.id}>Tòa {item.building_code} - Tầng {item.floor_number}</option>)}</select></Field></div>}
          {form.target_type === "room" && <div ref={setFieldRef("target_value")}><Field label="Phòng" error={fieldErrors.target_value}><select className={inputClass} value={form.target_value} onChange={(e) => { setForm({ ...form, target_value: e.target.value }); clearFieldError("target_value"); }}><option value="">Chọn phòng</option>{options.rooms.map((item) => <option key={item.id} value={item.id}>{item.building_code}{item.room_number}</option>)}</select></Field></div>}
          {form.target_type === "students" && (
            <div ref={setFieldRef("selected_students")}>
            <Field label="Sinh viên" error={fieldErrors.selected_students}>
              <div className="relative">
                <input className={inputClass} value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder="Tìm MSSV hoặc họ tên" />
                {studentResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-2xl border border-[#d6e2f1] bg-white shadow-[0_18px_36px_rgba(15,23,42,0.12)]">
                    {studentResults.map((student) => (
                      <button key={student.id} type="button" onClick={() => addStudent(student)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-[#f5f8ff]">
                        <span className="font-bold text-[#1a2d52]">{student.full_name}</span>
                        <span className="text-xs text-[#6f84ad]">{student.student_code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {form.selected_students.map((student) => (
                  <span key={student.id} className="inline-flex items-center gap-2 rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-bold text-[#24407f]">
                    {student.student_code}
                    <button type="button" onClick={() => setForm((current) => ({ ...current, selected_students: current.selected_students.filter((item) => item.id !== student.id) }))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </Field>
            </div>
          )}

          <div ref={setFieldRef("channels")}>
          <Field label="Kênh gửi" error={fieldErrors.channels}>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-2xl border border-[#d6e2f1] px-4 py-3 text-sm font-bold text-[#24407f]"><input type="checkbox" checked={form.send_web} onChange={(e) => { setForm({ ...form, send_web: e.target.checked }); if (e.target.checked || form.send_email) clearFieldError("channels"); }} />Thông báo trên web</label>
              <label className="flex items-center gap-2 rounded-2xl border border-[#d6e2f1] px-4 py-3 text-sm font-bold text-[#24407f]"><input type="checkbox" checked={form.send_email} onChange={(e) => { setForm({ ...form, send_email: e.target.checked }); if (e.target.checked || form.send_web) clearFieldError("channels"); }} />Email</label>
            </div>
          </Field>
          </div>

          <div ref={setFieldRef("content")}>
            <Field label="Nội dung *" error={fieldErrors.content}><textarea rows={8} className={`${inputClass} resize-y`} value={form.content} onChange={(e) => { setForm({ ...form, content: e.target.value }); clearFieldError("content"); }} /></Field>
          </div>

          <Field label="Thời gian gửi">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-2xl border border-[#d6e2f1] px-4 py-3 text-sm font-bold text-[#24407f]"><input type="radio" checked={form.send_mode === "now"} onChange={() => { setForm({ ...form, send_mode: "now", scheduled_at: "" }); clearFieldError("scheduled_at"); }} />Gửi ngay</label>
              <label className="flex items-center gap-2 rounded-2xl border border-[#d6e2f1] px-4 py-3 text-sm font-bold text-[#24407f]"><input type="radio" checked={form.send_mode === "schedule"} onChange={() => setForm({ ...form, send_mode: "schedule" })} />Hẹn giờ</label>
            </div>
            {form.send_mode === "schedule" && <div ref={setFieldRef("scheduled_at")}><input type="datetime-local" className={`${inputClass} mt-3`} value={form.scheduled_at} onChange={(e) => { setForm({ ...form, scheduled_at: e.target.value }); clearFieldError("scheduled_at"); }} />{fieldErrors.scheduled_at && <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.scheduled_at}</p>}</div>}
          </Field>

          <div className="flex flex-wrap justify-end gap-3 border-t border-[#eef3fb] pt-4">
            <button type="button" disabled={saving} onClick={() => void submit("draft")} className={`${buttonClass} bg-[#eef5ff] text-[#24407f]`}><Save className="h-4 w-4" />Lưu nháp</button>
            <button type="button" onClick={() => setPreviewOpen(true)} className={`${buttonClass} bg-white text-[#244cb8] ring-1 ring-[#d6e2f1]`}><Eye className="h-4 w-4" />Xem trước</button>
            <button type="button" disabled={saving} onClick={() => void submit(form.send_mode === "schedule" ? "schedule" : "send")} className={`${buttonClass} bg-[#244cb8] text-white`}><Send className="h-4 w-4" />Gửi thông báo</button>
          </div>
        </div>

        <div className="h-fit rounded-[20px] border border-[#d6e2f1] bg-white p-5 shadow-[0_12px_28px_rgba(36,76,184,0.08)]">
          <p className="text-sm font-bold text-[#1a2d52]">Tóm tắt</p>
          <div className="mt-4 space-y-3 text-sm text-[#5570a0]">
            <p>Loại: <span className="font-bold text-[#1a2d52]">{typeMeta[form.type].label}</span></p>
            <p>Mức độ: <span className="font-bold text-[#1a2d52]">{priorityOptions.find((item) => item.value === form.priority)?.label}</span></p>
            <p>Kênh: <span className="font-bold text-[#1a2d52]">{[form.send_web ? "Web" : null, form.send_email ? "Email" : null].filter(Boolean).join(", ") || "-"}</span></p>
            <p>Thời gian: <span className="font-bold text-[#1a2d52]">{form.send_mode === "schedule" ? form.scheduled_at || "Chưa chọn" : "Gửi ngay"}</span></p>
          </div>
        </div>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-[24px] bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#1a2d52]">Xem trước thông báo</h2>
              <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-xl p-2 text-[#6f84ad] hover:bg-[#eef5ff]"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 rounded-[20px] border border-[#d6e2f1] bg-[#f8fbff] p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#244cb8]"><BellRing className="h-5 w-5" /></span>
                <div>
                  <Badge className={typeMeta[form.type].className}>{typeMeta[form.type].label}</Badge>
                  <h3 className="mt-3 text-lg font-extrabold text-[#1a2d52]">{form.title || "Tiêu đề thông báo"}</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#5570a0]">{form.content || "Nội dung thông báo"}</p>
                  <p className="mt-3 text-xs font-bold text-[#8aa4cc]">{[form.send_web ? "Web" : null, form.send_email ? "Email" : null].filter(Boolean).join(", ")}</p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setPreviewOpen(false)} className={`${buttonClass} bg-[#eef5ff] text-[#24407f]`}>Đóng</button>
              <button type="button" onClick={() => { setPreviewOpen(false); void submit(form.send_mode === "schedule" ? "schedule" : "send"); }} className={`${buttonClass} bg-[#244cb8] text-white`}>Xác nhận gửi</button>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-[#1a2d52]">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function AnnouncementDetail({ id }: { id: number }) {
  const [item, setItem] = useState<SystemAnnouncement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [failedModalOpen, setFailedModalOpen] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  const load = (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    return getSystemAnnouncement(id)
      .then((nextItem) => {
        setItem(nextItem);
        return nextItem;
      })
      .catch((err) => {
        setItem(null);
        setError(getErrorMessage(err, "Không thể tải chi tiết thông báo."));
        return null;
      })
      .finally(() => {
        if (showLoading) setLoading(false);
      });
  };

  useEffect(() => {
    void load();
  }, [id]);

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#244cb8]" /></div>;
  }

  if (error || !item) {
    return (
      <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-6 text-sm font-semibold text-rose-700">
        {error || "Không tìm thấy thông báo."}
      </div>
    );
  }

  const stats = item.stats ?? {
    total_recipients: item.recipient_count,
    read: item.read_count,
    unread: item.unread_count,
    email_sent: item.email_sent_count,
    email_failed: item.email_failed_count,
    email_pending: item.email_pending_count,
  };
  const channels = [item.send_web ? "Web" : null, item.send_email ? "Email" : null].filter(Boolean).join(", ") || "-";
  const failedRecipients = (item.recipients ?? []).filter((recipient) => recipient.email_status === "failed");
  const showSentTime = Boolean(item.sent_at);
  const showScheduledTime = Boolean(item.scheduled_at && (item.status === "scheduled" || item.sent_at));
  const failureReason = item.status === "failed" && stats.total_recipients === 0
    ? "Không tìm thấy sinh viên phù hợp với đối tượng nhận."
    : item.status === "failed" && stats.email_failed > 0
      ? `Có ${stats.email_failed} email gửi thất bại.`
      : "";
  const handleResendFailedEmails = async () => {
    if (!item.send_email || stats.email_failed <= 0) return;
    setResendingEmail(true);
    setError("");
    try {
      await resendSystemAnnouncementEmail(item.id);
      const nextItem = await load(false);
      const nextStats = nextItem?.stats ?? {
        total_recipients: nextItem?.recipient_count ?? 0,
        read: nextItem?.read_count ?? 0,
        unread: nextItem?.unread_count ?? 0,
        email_sent: nextItem?.email_sent_count ?? 0,
        email_failed: nextItem?.email_failed_count ?? 0,
        email_pending: nextItem?.email_pending_count ?? 0,
      };
      if (nextStats.email_failed <= 0) setFailedModalOpen(false);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể gửi lại email."));
    } finally {
      setResendingEmail(false);
    }
  };
  const announcementInfo = [
    { label: "Loại thông báo", value: typeMeta[item.type].label },
    { label: "Mức độ", value: priorityOptions.find((option) => option.value === item.priority)?.label },
    { label: "Trạng thái", value: statusMeta[item.status].label },
    { label: "Đối tượng nhận", value: item.target_label },
    { label: "Kênh gửi", value: channels },
    ...(showSentTime ? [{ label: "Thời gian gửi", value: formatDate(item.sent_at) }] : []),
    ...(showScheduledTime ? [{ label: "Thời gian hẹn", value: formatDate(item.scheduled_at) }] : []),
  ];
  const deliveryStats = [
    { label: "Tổng người nhận", value: stats.total_recipients },
    { label: "Đã đọc", value: stats.read },
    { label: "Chưa đọc", value: stats.unread },
    ...(item.send_email ? [
      { label: "Email thành công", value: stats.email_sent },
      { label: "Email lỗi", value: stats.email_failed > 0 ? <span className="text-rose-600">{stats.email_failed}</span> : stats.email_failed },
      { label: "Email đang chờ", value: stats.email_pending },
    ] : []),
  ];

  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6">
      <div className="rounded-[20px] border border-[#c1d6f4] bg-white p-6 shadow-[0_12px_28px_rgba(36,76,184,0.08)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/admin/content/announcements" className="inline-flex items-center gap-2 text-sm font-bold text-[#5470a6]"><ArrowLeft className="h-4 w-4" />Quay lại</Link>
          <Badge className={statusMeta[item.status].className}>{statusMeta[item.status].label}</Badge>
        </div>

        <div className="mt-5">
          <h1 className="text-[24px] font-bold text-[#1a2d52]">{item.title}</h1>
          <div className="mt-3 rounded-2xl border border-[#e5edf8] bg-[#f8fbff] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7b8fb7]">Nội dung</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#1f3152]">{item.content || "-"}</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <InfoSection title="THÔNG TIN THÔNG BÁO" items={announcementInfo} />
          {failureReason && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-rose-600">Lý do lỗi</p>
              <p className="mt-1 text-sm font-bold text-rose-700">{failureReason}</p>
            </div>
          )}
          <InfoSection
            title="THỐNG KÊ GỬI / ĐỌC"
            items={deliveryStats}
            actions={item.send_email && stats.email_failed > 0 && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setFailedModalOpen(true)} className={`${buttonClass} bg-rose-50 text-rose-700`}>
                  Xem danh sách lỗi
                </button>
                <button type="button" disabled={resendingEmail} onClick={() => void handleResendFailedEmails()} className={`${buttonClass} bg-amber-50 text-amber-700`}>
                  <RotateCcw className={`h-4 w-4 ${resendingEmail ? "animate-spin" : ""}`} />
                  Gửi lại email
                </button>
              </div>
            )}
          />
        </div>

        {failedModalOpen && item.send_email && stats.email_failed > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-[24px] bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold text-[#1a2d52]">Danh sách email lỗi</h2>
                <button type="button" onClick={() => setFailedModalOpen(false)} className="rounded-xl p-2 text-[#6f84ad] hover:bg-[#eef5ff]"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-4 max-h-[58vh] overflow-auto">
                <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.08em] text-[#6f84ad]">
                    <tr>
                      <th className="border-b border-[#e5edf8] px-3 py-3">MSSV</th>
                      <th className="border-b border-[#e5edf8] px-3 py-3">Họ tên</th>
                      <th className="border-b border-[#e5edf8] px-3 py-3">Email</th>
                      <th className="border-b border-[#e5edf8] px-3 py-3">Phòng</th>
                      <th className="border-b border-[#e5edf8] px-3 py-3">Lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedRecipients.length === 0 ? (
                      <tr><td colSpan={5} className="px-3 py-8 text-center text-[#6f84ad]">Không có email lỗi.</td></tr>
                    ) : failedRecipients.map((recipient) => (
                      <tr key={recipient.id} className="text-[#1f3152]">
                        <td className="border-b border-[#eef3fb] px-3 py-3 font-bold">{recipient.student_code || "-"}</td>
                        <td className="border-b border-[#eef3fb] px-3 py-3">{recipient.full_name || "-"}</td>
                        <td className="border-b border-[#eef3fb] px-3 py-3">{recipient.email || "-"}</td>
                        <td className="border-b border-[#eef3fb] px-3 py-3">{recipient.room || "-"}</td>
                        <td className="border-b border-[#eef3fb] px-3 py-3 text-rose-600">{recipient.email_error || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button type="button" onClick={() => setFailedModalOpen(false)} className={`${buttonClass} bg-[#eef5ff] text-[#24407f]`}>Đóng</button>
                <button type="button" disabled={resendingEmail} onClick={() => void handleResendFailedEmails()} className={`${buttonClass} bg-amber-50 text-amber-700`}>
                  <RotateCcw className={`h-4 w-4 ${resendingEmail ? "animate-spin" : ""}`} />
                  Gửi lại email
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}

function InfoSection({ title, items, actions }: { title: string; items: Array<{ label: string; value: React.ReactNode }>; actions?: React.ReactNode }) {
  const visibleItems = items.filter((item) => hasInfoValue(item.value));

  if (visibleItems.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#e5edf8] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[#7b8fb7]">{title}</h2>
        {actions}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {visibleItems.map((item) => (
          <InfoBox key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e5edf8] bg-[#f8fbff] px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7b8fb7]">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-[#1a2d52]">{value}</p>
    </div>
  );
}

function hasInfoValue(value: React.ReactNode) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "" && value.trim() !== "-";
  return true;
}
