import { useMemo } from "react";
import { createPortal } from "react-dom";
import { FileText, X } from "lucide-react";
import type { BedStudent } from "../../../api/roomApi";
import StudentMiniInfo from "./StudentMiniInfo";
import { formatDate } from "../../../utils/dateFormat";

type StudentRecord = Record<string, unknown>;

type BedStudentDetailModalProps = {
  student: BedStudent;
  bedNumber: string;
  roomCode: string;
  onClose: () => void;
  /** Chỉ hiện nút "Xem chi tiết lưu trú đầy đủ" khi có occupancy để xem (student.occupancy?.id tồn tại). */
  onViewFullOccupancyDetail?: () => void;
};

const hiddenKeys = new Set([
  "password",
  "token",
  "remember_token",
  "deleted_at",
  "created_at",
  "updated_at",
  "email_verified_at",
  "pivot",
  "laravel_through_key",
]);

const sectionConfig = [
  {
    title: "Thông tin cá nhân",
    keys: [
      "full_name",
      "student_code",
      "class_name",
      "faculty",
      "academic_status",
      "gender",
      "date_of_birth",
      "cccd",
      "citizen_id",
      "identity_number",
      "email",
      "phone",
      "permanent_address",
    ],
  },
];

function formatLabel(key: string) {
  const labels: Record<string, string> = {
    full_name: "Họ tên",
    student_code: "MSSV",
    gender: "Giới tính",
    date_of_birth: "Ngày sinh",
    cccd: "CCCD",
    citizen_id: "CCCD",
    identity_number: "CCCD",
    email: "Email",
    phone: "Số điện thoại",
    avatar: "Avatar",
    faculty: "Khoa",
    major: "Ngành",
    department: "Khoa",
    class_name: "Lớp",
    course_year: "Khóa học",
    academic_status: "Tình trạng học tập",
    admission_year: "Năm nhập học",
    building_code: "Tòa",
    floor_number: "Tầng",
    room_code: "Phòng",
    bed_number: "Giường",
    check_in_date: "Ngày vào ở",
    temporary_assignment: "Loại lưu trú",
    occupancy_type: "Loại lưu trú",
    occupancy_status: "Trạng thái lưu trú",
    registration_period: "Đợt đăng ký",
    priority_object: "Đối tượng ưu tiên",
    student_priority: "Đối tượng ưu tiên",
    permanent_address: "Địa chỉ thường trú",
    temporary_address: "Địa chỉ tạm trú",
    emergency_contact: "Người liên hệ khẩn cấp",
    emergency_phone: "Số điện thoại người thân",
    relative_phone: "Số điện thoại người thân",
    parent_phone: "Số điện thoại người thân",
  };

  return labels[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function isHiddenKey(key: string) {
  const normalized = key.toLowerCase();
  return hiddenKeys.has(normalized) || normalized.endsWith("_token") || normalized.includes("password");
}

function isEmptyValue(value: unknown) {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as StudentRecord).length === 0;
  return false;
}

function formatValue(value: unknown): string {
  if (isEmptyValue(value)) return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value);
    if (value.toLowerCase() === "male") return "Nam";
    if (value.toLowerCase() === "female") return "Nữ";
    const academicStatusLabels: Record<string, string> = {
      studying: "Đang học",
      temporary_leave: "Tạm nghỉ",
      dropped_out: "Đã thôi học",
      suspended: "Đình chỉ",
      waiting_graduation: "Chờ tốt nghiệp",
      graduated: "Đã tốt nghiệp",
      overtime_training: "Quá hạn đào tạo",
      transferred: "Đã chuyển trường",
    };
    if (academicStatusLabels[value]) return academicStatusLabels[value];
    return value;
  }
  if (Array.isArray(value)) return `${value.length} mục`;
  if (typeof value === "object") {
    const record = value as StudentRecord;
    if ("is_temporary" in record) return record.is_temporary ? "Chuyển tạm do bảo trì" : "Bình thường";
    return Object.entries(record)
      .filter(([key, item]) => !isHiddenKey(key) && !isEmptyValue(item))
      .slice(0, 3)
      .map(([key, item]) => `${formatLabel(key)}: ${formatValue(item)}`)
      .join(" · ") || "—";
  }
  return String(value);
}

function InfoCard({ title, rows, className = "" }: { title: string; rows: Array<[string, unknown]>; className?: string }) {
  if (rows.length === 0) return null;

  return (
    <section className={`rounded-2xl border border-[#d8e4f5] bg-white p-4 shadow-sm ${className}`}>
      <h4 className="text-sm font-bold uppercase text-[#1a2d52]">{title}</h4>
      <div className="mt-3 space-y-2">
        {rows.map(([key, value]) => (
          <div key={key} className="grid grid-cols-[minmax(7rem,0.9fr)_minmax(0,1.1fr)] gap-3 rounded-xl bg-[#f8fbff] px-3 py-2">
            <p className="text-xs font-semibold text-[#61779d]">{formatLabel(key)}</p>
            <p className="min-w-0 break-words text-sm font-semibold text-[#1f3152]">{formatValue(value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function BedStudentDetailModal({
  student,
  bedNumber,
  roomCode,
  onClose,
  onViewFullOccupancyDetail,
}: BedStudentDetailModalProps) {
  const studentRecord = student as StudentRecord;

  const sectionRows = useMemo(() => {
    return sectionConfig.map((section) => {
      const rows = section.keys
        .map((key): [string, unknown] | null => {
          const value = studentRecord[key];
          if (isHiddenKey(key) || isEmptyValue(value)) return null;
          return [key, value];
        })
        .filter(Boolean) as Array<[string, unknown]>;
      return { title: section.title, rows };
    });
  }, [studentRecord]);

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />

      <div className="relative z-[111] flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#d5e2f5] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] p-5">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-[#1a2d52]">THÔNG TIN SINH VIÊN</h3>
            <p className="mt-0.5 text-sm text-[#61779d]">Phòng {roomCode} · Giường {bedNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="rounded-2xl border border-[#d8e4f5] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-5 shadow-sm">
            <StudentMiniInfo student={student} size="lg" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {sectionRows.map((section) => (
              <InfoCard key={section.title} title={section.title} rows={section.rows} className="lg:col-span-2" />
            ))}
          </div>

          {onViewFullOccupancyDetail ? (
            <div className="mt-5">
              <button
                type="button"
                onClick={onViewFullOccupancyDetail}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-3 text-sm font-bold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
              >
                <FileText className="h-4 w-4" />
                Xem chi tiết lưu trú đầy đủ
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
