import { occupancies, type Occupancy, type OccupancyStatus } from "./occupancies";
import { students } from "./students";

type OccupancyListener = (rows: Occupancy[]) => void;

let occupancyRows: Occupancy[] = structuredClone(occupancies);
const listeners = new Set<OccupancyListener>();

const emitOccupancyChange = () => {
  const rows = getOccupancies();
  listeners.forEach((listener) => listener(rows));
};

export function getOccupancies() {
  return structuredClone(occupancyRows);
}

export function subscribeOccupancies(listener: OccupancyListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function updateOccupancyById(
  id: number,
  status: OccupancyStatus,
  forcedCheckoutReason?: string,
  leaveRequest?: Occupancy["leaveRequest"],
) {
  occupancyRows = occupancyRows.map((item) => {
    if (item.id !== id) {
      return item;
    }

    if (status === "FORCED_CHECKOUT") {
      return { ...item, status, forcedCheckoutReason };
    }

    if (status === "CHECKOUT_REQUESTED") {
      return { ...item, status, forcedCheckoutReason: undefined, leaveRequest: leaveRequest ?? item.leaveRequest };
    }

    return { ...item, status, forcedCheckoutReason: undefined };
  });

  emitOccupancyChange();
  return getOccupancies().find((item) => item.id === id) ?? null;
}

export function requestCheckoutByStudentCode(studentCode: string, leaveRequest?: Occupancy["leaveRequest"]) {
  const student = students.find((item) => item.studentCode === studentCode);

  if (!student) {
    return null;
  }

  const occupancy = occupancyRows.find((item) => item.studentId === student.id);

  if (!occupancy) {
    return null;
  }

  return updateOccupancyById(occupancy.id, "CHECKOUT_REQUESTED", undefined, leaveRequest);
}
