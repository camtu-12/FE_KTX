import { myRoom, type LeaveRequest, type MyRoom, type MyRoomStatus } from "../../../mocks/myRoom";
import { requestCheckoutByStudentCode } from "../../../mocks/occupancyStore";

export type SubmitLeaveRequestPayload = {
  reason: string;
  expectedLeaveDate: string;
  note?: string;
};

let myOccupancy: MyRoom = structuredClone(myRoom);

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
