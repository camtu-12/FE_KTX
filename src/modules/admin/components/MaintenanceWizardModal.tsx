import { CheckCircle2, X } from "lucide-react";
import type { BedMaintenancePlan, MaintenanceBedOption, RoomMaintenancePlan } from "../../../api/maintenanceApi";
import { formatDate } from "../../../utils/dateFormat";

export type MaintenanceWizardState =
  | {
      type: "bed";
      step: number;
      plan: BedMaintenancePlan;
      targetBedId: string;
    }
  | {
      type: "room";
      step: number;
      plan: RoomMaintenancePlan;
      assignments: Record<number, string>;
      reason: string;
      startedAt: string;
      expectedEndAt: string;
    };

type MaintenanceWizardModalProps = {
  state: MaintenanceWizardState;
  error: string;
  submitting: boolean;
  onClose: () => void;
  onStepChange: (step: number) => void;
  onBedTargetChange: (bedId: string) => void;
  onRoomAssignmentChange: (occupancyId: number, bedId: string) => void;
  onConfirm: () => void;
};

const bedSteps = ["Sinh viên bị ảnh hưởng", "Vị trí chuyển tạm", "Xác nhận"];
const roomSteps = ["Sinh viên bị ảnh hưởng", "Vị trí tạm", "Xác nhận"];

const priorityLabel: Record<number, string> = {
  0: "Cùng phòng",
  1: "Cùng tầng",
  2: "Cùng tòa",
  3: "Cùng giới tính",
};

function getInitials(name?: string | null) {
  if (!name) return "SV";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function StudentCard({
  avatar,
  name,
  code,
  room,
  bed,
}: {
  avatar?: string | null;
  name?: string | null;
  code?: string | null;
  room: string;
  bed: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#d8e4f5] bg-white p-3">
      {avatar ? (
        <img src={avatar} alt={name ?? "Sinh viên"} className="h-12 w-12 rounded-full object-cover ring-2 ring-white" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eaf2ff] text-sm font-bold text-[#244cb8]">
          {getInitials(name)}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[#1a2d52]">{name ?? "Chưa có tên"}</p>
        <p className="text-xs font-semibold text-[#2563eb]">MSSV: {code ?? "--"}</p>
        <p className="text-xs text-[#61779d]">
          Phòng {room} - Giường {bed}
        </p>
      </div>
    </div>
  );
}

function getOptionLabel(option: MaintenanceBedOption) {
  return `${option.room_code} - Giường ${option.bed_number} - ${
    option.position === "bottom" ? "Tầng dưới" : "Tầng trên"
  } (${priorityLabel[option.priority] ?? "Khả dụng"})`;
}

function getOriginalRoom(item: RoomMaintenancePlan["affected"][number]) {
  return item.original_room_code ?? item.current_room;
}

function getOriginalBed(item: RoomMaintenancePlan["affected"][number]) {
  return item.original_bed_number ?? item.current_bed;
}

function getPrioritySummary(option: MaintenanceBedOption) {
  if (option.priority_labels?.length) return option.priority_labels.join(", ");
  const labels = ["Cùng giới tính", "Cùng tòa", "Cùng tầng", "Còn giường trống"];
  return labels.slice(0, Math.max(1, 4 - Math.min(option.priority, 3))).join(", ");
}

export default function MaintenanceWizardModal({
  state,
  error,
  submitting,
  onClose,
  onStepChange,
  onBedTargetChange,
  onRoomAssignmentChange,
  onConfirm,
}: MaintenanceWizardModalProps) {
  const title = state.type === "bed" ? "Chuyển sinh viên tạm thời" : "Kế hoạch di dời tạm thời";
  const steps = state.type === "room" ? roomSteps : bedSteps;
  const canConfirm =
    state.type === "bed"
      ? Boolean(state.targetBedId)
      : state.plan.affected.length > 0
        && state.plan.affected.every((item) => Boolean(state.assignments[item.occupancy_id]))
        && Boolean(state.reason.trim())
        && Boolean(state.startedAt)
        && Boolean(state.expectedEndAt);
  const canContinue =
    state.type === "bed"
      ? state.step !== 2 || Boolean(state.targetBedId)
      : state.step === 2
          ? state.plan.affected.every((item) => Boolean(state.assignments[item.occupancy_id]))
          : true;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/35" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#d5e2f5] bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h3 className="text-xl font-bold text-[#1a2d52]">{title}</h3>
            <p className="mt-1 text-sm text-[#61779d]">Thực hiện theo wizard để dữ liệu chuyển tạm được ghi nhận đúng.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-4">
          <div className="grid grid-cols-3 gap-2">
            {steps.map((label, index) => {
              const step = index + 1;
              const active = state.step === step;
              const done = state.step > step;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onStepChange(step)}
                  className={`rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition ${
                    done
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : active
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-amber-100 bg-amber-50/40 text-[#8a6d2d]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <span className="font-bold">Bước {step}</span>}
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {state.step === 1 && state.type === "room" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p><span className="font-semibold">Lý do bảo trì:</span> {state.reason || "--"}</p>
                <p><span className="font-semibold">Ngày bắt đầu:</span> {formatDate(state.startedAt)}</p>
                <p><span className="font-semibold">Ngày dự kiến hoàn thành:</span> {formatDate(state.expectedEndAt)}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {state.plan.affected.map((item) => (
                  <StudentCard
                    key={item.occupancy_id}
                    avatar={item.student?.avatar}
                    name={item.student?.full_name}
                    code={item.student?.student_code}
                    room={getOriginalRoom(item)}
                    bed={getOriginalBed(item)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {state.step === 1 && state.type === "bed" ? (
            <div className="space-y-3">
              <StudentCard
                avatar={state.plan.source.student?.avatar}
                name={state.plan.source.student?.full_name}
                code={state.plan.source.student?.student_code}
                room={state.plan.source.room.room_code}
                bed={state.plan.source.bed.bed_number}
              />
            </div>
          ) : null}

          {state.step === 2 ? (
            <div className="space-y-4">
              {state.type === "bed" ? (
                <div>
                  <label className="block text-sm font-semibold text-[#1a2d52]">Giường chuyển tạm</label>
                  <select
                    value={state.targetBedId}
                    onChange={(event) => onBedTargetChange(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Chọn giường khả dụng</option>
                    {state.plan.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {getOptionLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : state.plan.affected.map((item) => {
                const selectedId = state.assignments[item.occupancy_id] ?? "";
                const selectedOption = state.plan.options.find((option) => String(option.id) === selectedId) ?? null;
                const roomCodes = Array.from(new Set(state.plan.options.map((option) => option.room_code)));
                const selectedRoomCode = selectedOption?.room_code ?? "";
                const roomBeds = selectedRoomCode
                  ? state.plan.options.filter((option) => option.room_code === selectedRoomCode)
                  : [];

                return (
                  <div key={item.occupancy_id} className="rounded-2xl border border-[#d8e4f5] bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-[#1a2d52]">{item.student?.full_name ?? "Sinh viên"}</p>
                        <p className="text-xs text-[#61779d]">Phòng gốc: {getOriginalRoom(item)}</p>
                        <p className="text-xs text-[#61779d]">Giường gốc: {getOriginalBed(item)}</p>
                      </div>
                      <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
                        Điều chuyển tạm
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-600">Chọn phòng</label>
                        <select
                          value={selectedRoomCode}
                          onChange={(event) => {
                            const firstBed = state.plan.options.find((option) => option.room_code === event.target.value);
                            onRoomAssignmentChange(item.occupancy_id, firstBed ? String(firstBed.id) : "");
                          }}
                          className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                        >
                          <option value="">Chọn phòng</option>
                          {roomCodes.map((roomCode) => (
                            <option key={roomCode} value={roomCode}>
                              {roomCode}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600">Chọn giường</label>
                        <select
                          value={selectedId}
                          onChange={(event) => onRoomAssignmentChange(item.occupancy_id, event.target.value)}
                          className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                        >
                          <option value="">Chọn giường</option>
                          {(selectedRoomCode ? roomBeds : state.plan.options).map((option) => (
                            <option key={option.id} value={option.id}>
                              Giường {option.bed_number} - {option.position === "bottom" ? "Tầng dưới" : "Tầng trên"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {selectedOption ? (
                      <div className="mt-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-3 text-sm">
                        <p className="font-bold text-[#1a2d52]">{item.student?.full_name ?? "Sinh viên"}</p>
                        <p className="mt-1 text-[#61779d]">{getOriginalRoom(item)} - Giường {getOriginalBed(item)}</p>
                        <p className="py-1 text-lg font-bold leading-none text-orange-600">↓</p>
                        <p className="font-semibold text-orange-700">{selectedOption.room_code} - Giường {selectedOption.bed_number}</p>
                        <p className="text-xs font-semibold text-orange-700">(Tạm thời)</p>
                        <p className="mt-2 text-xs text-[#61779d]">Ưu tiên: {getPrioritySummary(selectedOption)}</p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {state.step === 3 ? (
            state.type === "room" ? (
              <div className="space-y-3 rounded-2xl border border-blue-100 bg-slate-50 p-4">
                <p className="text-sm font-bold text-[#1a2d52]">Xác nhận kế hoạch di dời tạm thời</p>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-sm text-[#6f5a22]">
                  <p><span className="font-semibold">Lý do bảo trì:</span> {state.reason || "--"}</p>
                  <p><span className="font-semibold">Ngày bắt đầu:</span> {formatDate(state.startedAt)}</p>
                  <p><span className="font-semibold">Ngày dự kiến hoàn thành:</span> {formatDate(state.expectedEndAt)}</p>
                </div>
                {state.plan.affected.map((item) => {
                  const selectedOption = state.plan.options.find((option) => String(option.id) === state.assignments[item.occupancy_id]) ?? null;
                  return (
                    <div key={item.occupancy_id} className="rounded-2xl border border-white bg-white p-3 shadow-sm">
                      <p className="text-sm font-bold text-[#1a2d52]">{item.student?.full_name ?? "Sinh viên"}</p>
                      <p className="mt-1 text-sm text-[#61779d]">Phòng gốc: {getOriginalRoom(item)}</p>
                      <p className="text-sm text-[#61779d]">Giường gốc: {getOriginalBed(item)}</p>
                      <p className="text-sm text-[#61779d]">
                        Vị trí tạm: {selectedOption ? `${selectedOption.room_code} - Giường ${selectedOption.bed_number}` : "--"}
                      </p>
                    </div>
                  );
                })}
                <p className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-sm font-semibold text-[#6f5a22]">
                  Sau khi bảo trì hoàn tất, sinh viên sẽ được hoàn nguyên về vị trí cũ.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-sm font-semibold text-[#1a2d52]">Xác nhận chuyển tạm</p>
                <p className="mt-2 text-sm text-[#61779d]">
                  Hệ thống sẽ ghi lịch sử chuyển tạm, cập nhật occupancy và cập nhật trạng thái giường/phòng.
                </p>
              </div>
            )
          ) : null}

          {state.type === "bed" && state.plan.options.length === 0 ? (
            <p className="mt-3 text-sm text-amber-700">Không tìm thấy giường trống phù hợp để chuyển tạm.</p>
          ) : null}
          {state.type === "room" && !state.plan.can_start ? (
            <p className="mt-3 text-sm text-amber-700">Không đủ giường trống phù hợp cho toàn bộ sinh viên trong phòng.</p>
          ) : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
          <button type="button" onClick={onClose} className="rounded-xl border px-3 py-2 text-sm">
            Hủy
          </button>
          {state.step > 1 ? (
            <button type="button" onClick={() => onStepChange(state.step - 1)} className="rounded-xl border px-3 py-2 text-sm">
              Quay lại
            </button>
          ) : null}
          {state.step < 3 ? (
            <button
              type="button"
              onClick={() => onStepChange(state.step + 1)}
              disabled={!canContinue}
              className={`rounded-xl px-3 py-2 text-sm font-semibold text-white ${canContinue ? "bg-[#244cb8]" : "cursor-not-allowed bg-slate-300"}`}
            >
              Tiếp tục
            </button>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm || submitting}
              className={`rounded-xl px-3 py-2 text-sm font-semibold text-white ${
                !canConfirm || submitting ? "cursor-not-allowed bg-slate-300" : "bg-emerald-600"
              }`}
            >
              {submitting ? "Đang xử lý..." : "Xác nhận"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
