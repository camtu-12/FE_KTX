import { motion } from "framer-motion";
import { Filter, Hotel, Sparkles, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  registrationRequests,
  type RegistrationRequest,
} from "../data/registrationRequests";

type Gender = "male" | "female";

type Building = {
  building_code: string;
  gender_config: Record<string, Gender>;
};

type Room = {
  id: number;
  building_code: string;
  room_number: number;
  available_beds: number;
};

type Student = {
  id: number;
  name: string;
  studentCode: string;
  gender: Gender;
};

type GenderFilter = "student" | "male" | "female" | "all";

type RoomRow = Room & {
  floor: number;
  roomGender: Gender | null;
};

type RoomRowWithGender = Room & {
  floor: number;
  roomGender: Gender;
};

type AssignRoomRouteState = {
  request?: RegistrationRequest;
};

const buildingsData: Building[] = [
  {
    building_code: "A",
    gender_config: { "1": "male", "2": "female", "3": "female" },
  },
  {
    building_code: "B",
    gender_config: { "1": "male", "2": "female", "3": "female" },
  },
];

const roomsData: Room[] = [
  { id: 1, building_code: "A", room_number: 101, available_beds: 5 },
  { id: 2, building_code: "A", room_number: 102, available_beds: 2 },
  { id: 3, building_code: "A", room_number: 201, available_beds: 7 },
  { id: 4, building_code: "B", room_number: 103, available_beds: 4 },
  { id: 5, building_code: "B", room_number: 202, available_beds: 6 },
];

const fallbackStudent: Student = {
  id: 1,
  name: "Nguyễn Văn A",
  studentCode: "DH52201699",
  gender: "male",
};

const getGenderLabel = (gender: Gender) => (gender === "male" ? "Nam" : "Nữ");

const getGenderBadgeClass = (gender: Gender) =>
  gender === "male"
    ? "border-[#b8d2ff] bg-[#edf4ff] text-[#1e56b7]"
    : "border-[#f7bfd4] bg-[#fff0f6] text-[#bc3f70]";

export default function AssignRoomPage() {
  const location = useLocation();
  const { registrationId } = useParams<{ registrationId: string }>();
  const routeState = location.state as AssignRoomRouteState | null;

  const [buildings] = useState<Building[]>(buildingsData);
  const [rooms] = useState<Room[]>(roomsData);
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [floorFilter, setFloorFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("student");

  const [student] = useState<Student>(() => {
    const fromState = routeState?.request;
    if (fromState) {
      return {
        id: fromState.id,
        name: fromState.formData.fullName,
        studentCode: fromState.formData.mssv,
        gender: fromState.formData.gender === "female" ? "female" : "male",
      };
    }

    const id = Number(registrationId);
    if (!Number.isNaN(id)) {
      const found = registrationRequests.find((item) => item.id === id);
      if (found) {
        return {
          id: found.id,
          name: found.formData.fullName,
          studentCode: found.formData.mssv,
          gender: found.formData.gender === "female" ? "female" : "male",
        };
      }
    }

    return fallbackStudent;
  });

  const effectiveGenderFilter = useMemo<Gender | null>(() => {
    if (genderFilter === "all") {
      return null;
    }

    if (genderFilter === "student") {
      return student.gender;
    }

    return genderFilter;
  }, [genderFilter, student.gender]);

  const buildingOptions = useMemo(() => {
    return Array.from(new Set(rooms.map((room) => room.building_code))).sort();
  }, [rooms]);

  const floorOptions = useMemo(() => {
    return Array.from(new Set(rooms.map((room) => Math.floor(room.room_number / 100)))).sort(
      (a, b) => a - b,
    );
  }, [rooms]);

  const filteredRooms = useMemo<RoomRowWithGender[]>(() => {
    return rooms
      .map<RoomRow>((room) => {
        const floor = Math.floor(room.room_number / 100);
        const building = buildings.find((item) => item.building_code === room.building_code);
        const roomGender = building?.gender_config[String(floor)] ?? null;

        return {
          ...room,
          floor,
          roomGender,
        };
      })
      .filter((room) => {
        if (!room.roomGender) {
          return false;
        }

        if (buildingFilter !== "all" && room.building_code !== buildingFilter) {
          return false;
        }

        if (floorFilter !== "all" && room.floor !== Number(floorFilter)) {
          return false;
        }

        if (effectiveGenderFilter && room.roomGender !== effectiveGenderFilter) {
          return false;
        }

        return true;
      })
      .filter((room): room is RoomRowWithGender => room.roomGender !== null)
      .sort((a, b) => b.available_beds - a.available_beds);
  }, [buildings, buildingFilter, effectiveGenderFilter, floorFilter, rooms]);

  const handleChooseRoom = () => {
    window.alert("Phân phòng thành công");
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex min-h-full flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <div className="rounded-[22px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Phân phòng cho sinh viên</h1>
        <p className="mt-1 text-sm text-[#62789f]">Dữ liệu mock FE-only, chưa kết nối backend.</p>
      </div>

      <div className="rounded-[22px] border border-[#d3e0f2] bg-white/85 p-5 shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#6f84ad]">
          <UserRound className="h-4 w-4" />
          Thông tin sinh viên
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#5570a0]">
          <span>
            Họ tên: <strong className="text-[#1b3766]">{student.name}</strong>
          </span>
          <span className="h-1 w-1 rounded-full bg-[#93aad1]" />
          <span>
            MSSV: <strong className="text-[#1b3766]">{student.studentCode}</strong>
          </span>
          <span className="h-1 w-1 rounded-full bg-[#93aad1]" />
          <span>
            Giới tính:
            <span
              className={`ml-2 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getGenderBadgeClass(
                student.gender,
              )}`}
            >
              {getGenderLabel(student.gender)}
            </span>
          </span>
        </div>
      </div>

      <div className="rounded-[22px] border border-[#d3e0f2] bg-white p-5 shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#6f84ad]">
            <Hotel className="h-4 w-4" />
            Danh sách phòng phù hợp
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6f84ad]">
              <Filter className="h-3.5 w-3.5" />
              Bộ lọc
            </span>

            <select
              value={buildingFilter}
              onChange={(event) => setBuildingFilter(event.target.value)}
              className="h-10 rounded-xl border border-[#d2def0] bg-white px-3 text-sm text-[#24407f] outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12"
            >
              <option value="all">Tất cả tòa</option>
              {buildingOptions.map((buildingCode) => (
                <option key={buildingCode} value={buildingCode}>
                  Tòa {buildingCode}
                </option>
              ))}
            </select>

            <select
              value={floorFilter}
              onChange={(event) => setFloorFilter(event.target.value)}
              className="h-10 rounded-xl border border-[#d2def0] bg-white px-3 text-sm text-[#24407f] outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12"
            >
              <option value="all">Tất cả tầng</option>
              {floorOptions.map((floor) => (
                <option key={floor} value={String(floor)}>
                  Tầng {floor}
                </option>
              ))}
            </select>

            <select
              value={genderFilter}
              onChange={(event) => setGenderFilter(event.target.value as GenderFilter)}
              className="h-10 rounded-xl border border-[#d2def0] bg-white px-3 text-sm text-[#24407f] outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12"
            >
              <option value="student">Theo giới tính sinh viên</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="all">Tất cả</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#dde7f5]">
          <table className="min-w-[760px] w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Tòa</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Phòng</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Tầng</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Giới tính</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Số giường trống</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room, index) => (
                <tr key={room.id} className="transition-colors hover:bg-[#f8fbff]">
                  <td className="border-t border-[#e7eef9] px-4 py-3 text-center text-sm font-semibold text-[#1f3152]">{room.building_code}</td>
                  <td className="border-t border-[#e7eef9] px-4 py-3 text-center text-sm text-[#35517f]">{room.room_number}</td>
                  <td className="border-t border-[#e7eef9] px-4 py-3 text-center text-sm text-[#35517f]">{room.floor}</td>
                  <td className="border-t border-[#e7eef9] px-4 py-3 text-center text-sm">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getGenderBadgeClass(
                        room.roomGender,
                      )}`}
                    >
                      {getGenderLabel(room.roomGender)}
                    </span>
                  </td>
                  <td className="border-t border-[#e7eef9] px-4 py-3 text-center text-sm font-semibold text-[#1f7a4e]">
                    <span>{room.available_beds}</span>
                    {index === 0 ? (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#edf9f1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#1d8a57]">
                        <Sparkles className="h-3 w-3" />
                        Gợi ý
                      </span>
                    ) : null}
                  </td>
                  <td className="border-t border-[#e7eef9] px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={handleChooseRoom}
                      className="rounded-lg bg-[linear-gradient(135deg,#1762c3_0%,#2f80ed_100%)] px-3.5 py-1.5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(23,98,195,0.22)] transition hover:-translate-y-0.5 hover:brightness-110"
                    >
                      Chọn
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="mt-4 rounded-xl border border-[#d8e3f2] bg-[#f8fbff] px-4 py-4 text-sm text-[#5a7197]">
            Không có phòng phù hợp với bộ lọc hiện tại.
          </div>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Link
          to="/admin/registrations"
          className="rounded-2xl border border-[#c9d8ef] bg-white px-5 py-2.5 text-sm font-semibold text-[#4b6494] transition hover:border-[#adc3e8] hover:text-[#244cb8]"
        >
          Quay lại danh sách
        </Link>
      </div>
    </motion.section>
  );
}
