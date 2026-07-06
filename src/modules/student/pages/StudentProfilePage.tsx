import { motion } from "framer-motion";
import { AlertTriangle, BadgeCheck, GraduationCap, IdCard, ImageIcon, ShieldAlert, UserRound, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchStudentProfile, type StudentProfileData } from "../../../api/studentProfileApi";
import { formatDate } from "../../../utils/dateFormat";

const FALLBACK = "Chưa cập nhật";

function displayValue(value?: string | number | null): string {
  if (value === null || value === undefined) return FALLBACK;
  const text = String(value).trim();
  return text ? text : FALLBACK;
}

function displayDate(value?: string | null): string {
  if (!value) return FALLBACK;
  const formatted = formatDate(value);
  return formatted === "—" ? FALLBACK : formatted;
}

const genderLabel: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
};

const academicStatusLabel: Record<string, string> = {
  studying: "Đang học",
  temporary_leave: "Tạm nghỉ học",
  dropped_out: "Đã thôi học",
  suspended: "Đình chỉ học",
  waiting_graduation: "Chờ tốt nghiệp",
  graduated: "Đã tốt nghiệp",
  overtime_training: "Học vượt thời hạn đào tạo",
  transferred: "Đã chuyển trường",
};

const studentStatusLabel: Record<string, string> = {
  active: "Đang hoạt động",
  inactive: "Ngừng hoạt động",
};

const residenceStatusLabel: Record<string, string> = {
  ACTIVE: "Đang lưu trú",
  ROOM_CONFIRMED: "Đã xác nhận phòng",
  PENDING_PAYMENT: "Chờ thanh toán",
};

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6d7fa6]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#1b3766]">{displayValue(value)}</p>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
  delay = 0,
}: {
  icon: typeof UserRound;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, delay, ease: "easeOut" }}
      className="rounded-[26px] border border-[#c4d7f3] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)]"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c4d7f3] bg-[#eef4ff] text-[#2f63da]">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-xl font-bold text-[#1a2d52] sm:text-2xl">{title}</h2>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </motion.div>
  );
}

function AccessNotice({ message }: { message: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <div className="rounded-[26px] border border-[#c4d7f3] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] p-5 text-[#1a2d52] shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-5 w-5 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold text-[#1a2d52]">Hồ sơ cá nhân</h1>
            <p className="mt-2 text-sm font-semibold text-[#5570a0]">{message}</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const data = await fetchStudentProfile();
        if (isActive) setProfile(data);
      } catch (error) {
        if (isActive) {
          setProfile(null);
          setLoadError(error instanceof Error ? error.message : "Không thể tải hồ sơ cá nhân.");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return <AccessNotice message="Đang tải hồ sơ cá nhân..." />;
  }

  if (!profile) {
    return <AccessNotice message={loadError || "Không thể tải hồ sơ cá nhân."} />;
  }

  const { student, family, residence, documents, priority_criteria: priorityCriteria, blacklist } = profile;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      {blacklist ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, ease: "easeOut" }}
          className="flex items-start gap-3 rounded-[22px] border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-[0_14px_30px_rgba(190,52,85,0.10)]"
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-rose-800">Trong danh sách hạn chế đăng ký</h3>
            <p className="mt-1 text-sm font-semibold">Lý do: {displayValue(blacklist.reason)}</p>
          </div>
        </motion.div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: "easeOut" }}
        className="rounded-[26px] border border-[#c4d7f3] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)]"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c4d7f3] bg-[#eef4ff] text-[#2f63da]">
            <IdCard className="h-4 w-4" />
          </span>
          <h2 className="text-xl font-bold text-[#1a2d52] sm:text-2xl">Thông tin sinh viên</h2>
        </div>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row">
          <div className="flex h-48 w-36 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#d8e3f1] bg-[#eef4ff]">
            {student.avatar_url ? (
              <img src={student.avatar_url} alt={student.full_name ?? "Avatar"} className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-14 w-14 text-[#7c8fb5]" />
            )}
          </div>

          <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <InfoRow label="MSSV" value={student.student_code} />
            <InfoRow label="Họ tên" value={student.full_name} />
            <InfoRow label="Ngày sinh" value={displayDate(student.date_of_birth)} />
            <InfoRow label="Giới tính" value={student.gender ? genderLabel[student.gender] ?? student.gender : null} />
            <InfoRow
              label="Trạng thái tài khoản"
              value={student.status ? studentStatusLabel[student.status] ?? student.status : null}
            />

            <InfoRow label="Số điện thoại" value={student.phone} />
            <InfoRow label="Số CMND/CCCD" value={student.cccd} />
            <InfoRow label="Ngày cấp CCCD" value={displayDate(student.cccd_issued_date)} />
            <InfoRow label="Nơi cấp CCCD" value={student.cccd_issued_place} />

            <InfoRow label="Quốc tịch" value={student.nationality} />
            <InfoRow label="Dân tộc" value={student.ethnicity} />
            <InfoRow label="Tôn giáo" value={student.religion} />
            <InfoRow label="Email" value={student.email} />
            <InfoRow label="Địa chỉ thường trú" value={student.permanent_address} />
            <InfoRow label="Tỉnh/Thành phố" value={student.province_name} />
          </div>
        </div>
      </motion.div>

      <SectionCard icon={GraduationCap} title="Thông tin khóa học" delay={0.04}>
        <InfoRow label="Lớp" value={student.class_name} />
        <InfoRow label="Ngành học / Khoa" value={student.faculty} />
        <InfoRow label="Khóa" value={student.course_year} />
        <InfoRow label="Năm học hiện tại" value={student.current_year} />
        <InfoRow
          label="Tình trạng học tập"
          value={student.academic_status ? academicStatusLabel[student.academic_status] ?? student.academic_status : null}
        />
      </SectionCard>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, delay: 0.08, ease: "easeOut" }}
        className="rounded-[26px] border border-[#c4d7f3] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)]"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c4d7f3] bg-[#eef4ff] text-[#2f63da]">
            <Users className="h-4 w-4" />
          </span>
          <h2 className="text-xl font-bold text-[#1a2d52] sm:text-2xl">Thông tin người thân</h2>
        </div>

        <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="space-y-4 sm:border-r sm:border-[#e3ecf9] sm:pr-6">
            <InfoRow label="Họ tên cha" value={family.father_name} />
            <InfoRow label="Năm sinh cha" value={family.father_birth_year} />
            <InfoRow label="Nghề nghiệp cha" value={family.father_job} />
            <InfoRow label="SĐT cha" value={family.father_phone} />
          </div>
          <div className="space-y-4">
            <InfoRow label="Họ tên mẹ" value={family.mother_name} />
            <InfoRow label="Năm sinh mẹ" value={family.mother_birth_year} />
            <InfoRow label="Nghề nghiệp mẹ" value={family.mother_job} />
            <InfoRow label="SĐT mẹ" value={family.mother_phone} />
          </div>
          <div className="sm:col-span-2 sm:border-t sm:border-[#e3ecf9] sm:pt-4">
            <InfoRow label="Địa chỉ liên hệ cha/mẹ" value={family.parent_address} />
          </div>
        </div>
      </motion.div>

      <SectionCard icon={BadgeCheck} title="Thông tin lưu trú hiện tại" delay={0.12}>
        <InfoRow label="Phòng" value={residence?.room_number} />
        <InfoRow label="Tòa" value={residence?.building_code} />
        <InfoRow label="Tầng" value={residence?.floor_number} />
        <InfoRow label="Giường" value={residence?.bed_number} />
        <InfoRow
          label="Trạng thái lưu trú"
          value={residence?.status ? residenceStatusLabel[residence.status] ?? residence.status : null}
        />
        <InfoRow label="Ngày bắt đầu lưu trú" value={displayDate(residence?.check_in_date)} />
        <InfoRow label="Ngày kết thúc lưu trú" value={displayDate(residence?.check_out_date)} />
      </SectionCard>

      {documents.cccd_front_url || documents.cccd_back_url ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.18, ease: "easeOut" }}
          className="rounded-[26px] border border-[#c4d7f3] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)]"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c4d7f3] bg-[#eef4ff] text-[#2f63da]">
              <ImageIcon className="h-4 w-4" />
            </span>
            <h2 className="text-xl font-bold text-[#1a2d52] sm:text-2xl">Ảnh CCCD đã nộp</h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6d7fa6]">Mặt trước</p>
              {documents.cccd_front_url ? (
                <img
                  src={documents.cccd_front_url}
                  alt="CCCD mặt trước"
                  className="mt-2 max-h-80 w-full rounded-2xl border border-[#d8e3f1] object-cover"
                />
              ) : (
                <p className="mt-2 text-sm font-semibold text-[#1b3766]">{FALLBACK}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6d7fa6]">Mặt sau</p>
              {documents.cccd_back_url ? (
                <img
                  src={documents.cccd_back_url}
                  alt="CCCD mặt sau"
                  className="mt-2 max-h-80 w-full rounded-2xl border border-[#d8e3f1] object-cover"
                />
              ) : (
                <p className="mt-2 text-sm font-semibold text-[#1b3766]">{FALLBACK}</p>
              )}
            </div>
          </div>
        </motion.div>
      ) : null}

      {priorityCriteria.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.24, ease: "easeOut" }}
          className="rounded-[26px] border border-[#c4d7f3] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)]"
        >
          <h2 className="text-xl font-bold text-[#1a2d52] sm:text-2xl">Tiêu chí ưu tiên đã khai báo</h2>
          <div className="mt-4 space-y-3">
            {priorityCriteria.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#d8e3f1] bg-[#f8fbff] px-4 py-3"
              >
                <p className="text-sm font-semibold text-[#1b3766]">{displayValue(item.name)}</p>
                <span className="rounded-full border border-[#c4d7f3] bg-white px-3 py-1 text-xs font-bold text-[#2f63da]">
                  {displayValue(item.status)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      ) : null}
    </motion.section>
  );
}
