import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { BedStudent } from "../../../api/roomApi";
import StudentMiniInfo from "./StudentMiniInfo";

type StudentRecord = Record<string, unknown>;

type BedStudentDetailModalProps = {
  student: BedStudent;
  bedNumber: string;
  roomCode: string;
  onClose: () => void;
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

const extensionTabs = [
  { id: "violations", label: "Vi phạm", empty: "📄 Chưa có dữ liệu vi phạm", keys: ["violations", "violation", "violation_history"] },
  { id: "billing", label: "Công nợ", empty: "💰 Chưa có công nợ", keys: ["billing", "billings", "debts", "debt", "fees"] },
  { id: "occupancy_history", label: "Lịch sử lưu trú", empty: "📄 Chưa có lịch sử lưu trú", keys: ["occupancy_history", "stay_history", "residence_history"] },
  { id: "transfer_history", label: "Lịch sử chuyển giường", empty: "🔄 Chưa có lịch sử chuyển giường", keys: ["transfer_history", "room_change_log", "room_change_logs"] },
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
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

function getExtensionData(student: StudentRecord, keys: string[]) {
  for (const key of keys) {
    const value = student[key];
    if (!isEmptyValue(value)) return value;
  }
  return null;
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

function DataPreview({ value }: { value: unknown }) {
  if (isEmptyValue(value)) return null;

  if (Array.isArray(value)) {
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-xl border border-[#e7eef9] bg-white px-3 py-2 text-sm text-[#1f3152]">
            {typeof item === "object" && item !== null ? (
              Object.entries(item as StudentRecord)
                .filter(([key, entryValue]) => !isHiddenKey(key) && !isEmptyValue(entryValue))
                .map(([key, entryValue]) => (
                  <p key={key}>
                    <span className="font-semibold text-[#61779d]">{formatLabel(key)}: </span>
                    {formatValue(entryValue)}
                  </p>
                ))
            ) : (
              <p>{formatValue(item)}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object" && value !== null) {
    return (
      <div className="rounded-xl border border-[#e7eef9] bg-white px-3 py-2 text-sm text-[#1f3152]">
        {Object.entries(value as StudentRecord)
          .filter(([key, entryValue]) => !isHiddenKey(key) && !isEmptyValue(entryValue))
          .map(([key, entryValue]) => (
            <p key={key}>
              <span className="font-semibold text-[#61779d]">{formatLabel(key)}: </span>
              {formatValue(entryValue)}
            </p>
          ))}
      </div>
    );
  }

  return <p className="rounded-xl border border-[#e7eef9] bg-white px-3 py-2 text-sm font-semibold text-[#1f3152]">{formatValue(value)}</p>;
}

export default function BedStudentDetailModal({ student, bedNumber, roomCode, onClose }: BedStudentDetailModalProps) {
  const [activeTab, setActiveTab] = useState(extensionTabs[0].id);
  const studentRecord = student as StudentRecord;

  useEffect(() => {
    const occupancy = student.occupancy ?? null;
    console.log("Student detail occupancy", {
      check_in_date: occupancy?.check_in_date ?? null,
      check_out_date: occupancy?.check_out_date ?? null,
      status: occupancy?.status ?? null,
    });
  }, [student.occupancy]);

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

  const activeExtension = extensionTabs.find((tab) => tab.id === activeTab) ?? extensionTabs[0];
  const activeExtensionData = getExtensionData(studentRecord, activeExtension.keys);

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

          <div className="mt-5 rounded-2xl border border-[#d8e4f5] bg-[#f8fbff] p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {extensionTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === tab.id ? "border-[#2563EB] bg-white text-[#2563EB]" : "border-slate-200 bg-white/70 text-[#61779d] hover:bg-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              {activeExtensionData ? (
                <DataPreview value={activeExtensionData} />
              ) : (
                <div className="rounded-2xl border border-dashed border-[#cfdcf0] bg-white px-4 py-8 text-center text-sm font-semibold text-[#7c8fb5]">
                  {activeExtension.empty}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
