import { myRoom, type LeaveRequest, type MyRoom, type MyRoomBed, type MyRoomStatus } from "../../../mocks/myRoom";
import { requestCheckoutByStudentCode } from "../../../mocks/occupancyStore";
import { getMyRegistration, getRegistrations, getRooms } from "../../../api/registrationService";
import { listViolationsByOccupancy } from "../../../api/violationApi";

export type SubmitLeaveRequestPayload = {
  reason: string;
  expectedLeaveDate: string;
  note?: string;
};

let myOccupancy: MyRoom = structuredClone(myRoom);

const toNumberOrNull = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeText = (value: unknown) => String(value ?? "").trim();

const resolveRoomGender = (value: unknown): MyRoom["roomGender"] => {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === "male" || normalized === "nam" ? "Nam" : "Nữ";
};

const resolveMyRoomStatus = (value: unknown): MyRoomStatus => {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "checkout_requested") {
    return "LEAVE_REQUESTED";
  }

  if (normalized === "checked_out") {
    return "LEFT";
  }

  if (normalized === "forced_checkout") {
    return "FORCED_LEFT";
  }

  if (normalized === "pending_payment") {
    return "PENDING_PAYMENT";
  }

  return "ACTIVE";
};

const resolveViolationLevel = (value: unknown): "MINOR" | "MEDIUM" | "SERIOUS" | undefined => {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "MINOR" || normalized === "MEDIUM" || normalized === "SERIOUS") {
    return normalized;
  }

  return undefined;
};

export async function getMyOccupancyFromBackend(email: string): Promise<MyRoom | null> {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    return null;
  }

  const [myRegistration, registrations, rooms] = await Promise.all([
    getMyRegistration(normalizedEmail),
    getRegistrations(),
    getRooms(),
  ]);

  if (
    !myRegistration ||
    myRegistration.status !== "approved" ||
    !myRegistration.assigned_room_id ||
    !myRegistration.bedId
  ) {
    return null;
  }

  const room = rooms.find((item) => item.id === myRegistration.assigned_room_id);

  if (!room) {
    return null;
  }

  const roomBeds = room.beds ?? [];
  const occupantByBedNumber = new Map<number, { occupantName: string; studentCode: string }>();

  const roomRegistrations = myRegistration
    ? [
        myRegistration,
        ...registrations.filter((registration) => registration.id !== myRegistration.id),
      ]
    : registrations;

  const ENDED_STATUSES = ["checked_out", "forced_checkout"];

  roomRegistrations.forEach((registration) => {
    if (
      registration.status !== "approved" ||
      registration.assigned_room_id !== room.id ||
      !registration.bedId ||
      ENDED_STATUSES.includes((registration.occupancy_status ?? "").toLowerCase())
    ) {
      return;
    }

    const bed = roomBeds.find((item) => item.id === registration.bedId);
    const bedNumber = toNumberOrNull(bed?.bed_number);

    if (!bedNumber) {
      return;
    }

    occupantByBedNumber.set(bedNumber, {
      occupantName: normalizeText(registration.formData.fullName) || "-",
      studentCode: normalizeText(registration.formData.mssv) || "-",
    });
  });

  const myBed = roomBeds.find((bed) => bed.id === myRegistration.bedId);
  const myBedNumber = toNumberOrNull(myBed?.bed_number);

  if (!myBedNumber) {
    return null;
  }

  const beds = roomBeds
    .map((bed) => {
      const bedNumber = toNumberOrNull(bed.bed_number);

      if (!bedNumber) {
        return null;
      }

      const isMyBed = bed.id === myRegistration.bedId;
      const nextBed: MyRoomBed = {
        bedNumber,
        status: bed.status === "maintenance" ? "MAINTENANCE" : "ACTIVE",
        ...(isMyBed
          ? {
              occupantName: normalizeText(myRegistration.formData.fullName) || "-",
              studentCode: normalizeText(myRegistration.formData.mssv) || "-",
            }
          : occupantByBedNumber.get(bedNumber)),
      };

      return nextBed;
    })
    .filter((bed): bed is MyRoomBed => bed !== null)
    .sort((a, b) => a.bedNumber - b.bedNumber);

  const occupancyViolations = myRegistration.occupancy_id
    ? await listViolationsByOccupancy(myRegistration.occupancy_id)
    : [];

  const forcedViolation = myRegistration.occupancy_status === "forced_checkout"
    ? occupancyViolations
        .filter((violation) => violation.actionTaken === "force_evicted")
        .sort((a, b) => b.id - a.id)[0]
    : undefined;

  const warningViolation = occupancyViolations
    .filter((violation) => violation.actionTaken === "reminded" || violation.actionTaken === "warned")
    .sort((a, b) => b.id - a.id)[0];

  return {
    roomCode: `${room.building_code}${room.room_number}`,
    buildingCode: room.building_code,
    floorNumber: room.floor_number ?? room.floor?.floor_number ?? 0,
    bedNumber: myBedNumber,
    startDate: myRegistration.formData.dormStartDate || myRegistration.submittedAt,
    endDate: myRegistration.formData.dormEndDate || "-",
    roomType: `${room.capacity} người`,
    roomGender: resolveRoomGender(room.gender ?? room.floor?.gender),
    status: resolveMyRoomStatus(myRegistration.occupancy_status),
    leftDate: myRegistration.check_out_date || undefined,
    leaveRequest: myRegistration.occupancy_status === "checkout_requested"
      ? {
          requestedAt: "",
          expectedLeaveDate: myRegistration.check_out_date || "",
          reason: myRegistration.occupancy_reason || "",
        }
      : undefined,
    forcedLeave: myRegistration.occupancy_status === "forced_checkout"
      ? {
          reason: myRegistration.occupancy_reason || "",
          decidedAt: myRegistration.check_out_date || "",
          violationTypeName: forcedViolation?.type?.name,
          violationTypeLevel: resolveViolationLevel(forcedViolation?.type?.level),
        }
      : undefined,
    warningNotice: warningViolation
      ? {
          reason: warningViolation.note || "",
          decidedAt: warningViolation.violationDate || "",
          violationTypeName: warningViolation.type?.name,
          violationTypeLevel: resolveViolationLevel(warningViolation.type?.level),
        }
      : undefined,
    beds,
    roommates: beds
      .filter((bed) => bed.bedNumber !== myBedNumber && bed.occupantName && bed.studentCode)
      .map((bed) => ({
        id: bed.bedNumber,
        fullName: bed.occupantName ?? "-",
        studentCode: bed.studentCode ?? "-",
        bedNumber: bed.bedNumber,
      })),
  };
}

export function getMyOccupancy() {
  return structuredClone(myOccupancy);
}

export function getOccupancyStatus() {
  return myOccupancy.status;
}

export function submitLeaveRequest(payload: SubmitLeaveRequestPayload) {
  const studentCode = myOccupancy.beds.find((bed) => bed.bedNumber === myOccupancy.bedNumber)?.studentCode;
  const leaveRequest: LeaveRequest = {
    requestedAt: new Date().toISOString().slice(0, 10),
    expectedLeaveDate: payload.expectedLeaveDate,
    reason: payload.reason,
    note: payload.note,
  };

  myOccupancy = {
    ...myOccupancy,
    status: "LEAVE_REQUESTED",
    leaveRequest,
  };

  if (studentCode) {
    requestCheckoutByStudentCode(studentCode, leaveRequest);
  }

  return getMyOccupancy();
}

export function setMockOccupancyStatus(status: MyRoomStatus) {
  myOccupancy = {
    ...myOccupancy,
    status,
  };

  return getMyOccupancy();
}
