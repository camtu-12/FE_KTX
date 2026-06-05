export type MyRoomStatus = "ACTIVE" | "LEAVE_REQUESTED" | "LEFT" | "FORCED_LEFT";

export type LeaveRequest = {
  requestedAt: string;
  expectedLeaveDate: string;
  reason: string;
  note?: string;
};

export type ForcedLeave = {
  reason: string;
  decidedAt: string;
};

export type MyRoomBed = {
  bedNumber: number;
  status?: "ACTIVE" | "MAINTENANCE";
  occupantName?: string;
  studentCode?: string;
};

export type MyRoomMate = {
  id: number;
  fullName: string;
  studentCode: string;
  bedNumber: number;
};

export type MyRoom = {
  roomCode: string;
  buildingCode: string;
  floorNumber: number;
  bedNumber: number;
  startDate: string;
  endDate: string;
  roomType: string;
  roomGender: "Nam" | "Nữ";
  status: MyRoomStatus;
  leftDate?: string;
  leaveRequest?: LeaveRequest;
  forcedLeave?: ForcedLeave;
  beds: MyRoomBed[];
  roommates: MyRoomMate[];
};

export const myRoom: MyRoom = {
  roomCode: "B203",
  buildingCode: "B",
  floorNumber: 2,
  bedNumber: 6,
  startDate: "2026-09-01",
  endDate: "2027-05-31",
  roomType: "8 người",
  roomGender: "Nữ",
  status: "ACTIVE",
  leaveRequest: {
    requestedAt: "",
    expectedLeaveDate: "",
    reason: "",
    note: "",
  },
  forcedLeave: {
    reason: "",
    decidedAt: "",
  },
  beds: [
    {
      bedNumber: 1,
      occupantName: "Trần Minh Anh",
      studentCode: "DH52200002",
    },
    {
      bedNumber: 2,
      occupantName: "Lê Ngọc Hân",
      studentCode: "DH52200003",
    },
    {
      bedNumber: 3,
      occupantName: "Phạm Thanh Trúc",
      studentCode: "DH52200004",
    },
    {
      bedNumber: 4,
      occupantName: "Võ Khánh Linh",
      studentCode: "DH52200005",
    },
    {
      bedNumber: 5,
      occupantName: "Hoàng Bảo Ngọc",
      studentCode: "DH52200007",
    },
    {
      bedNumber: 6,
      occupantName: "Nguyễn Thị Mai",
      studentCode: "DH52200006",
    },
    {
      bedNumber: 7,
    },
    {
      bedNumber: 8,
      occupantName: "Đỗ Hà Vy",
      studentCode: "DH52200008",
    },
  ],
  roommates: [
    {
      id: 1,
      fullName: "Trần Minh Anh",
      studentCode: "DH52200002",
      bedNumber: 1,
    },
    {
      id: 2,
      fullName: "Lê Ngọc Hân",
      studentCode: "DH52200003",
      bedNumber: 2,
    },
    {
      id: 3,
      fullName: "Phạm Thanh Trúc",
      studentCode: "DH52200004",
      bedNumber: 3,
    },
    {
      id: 4,
      fullName: "Võ Khánh Linh",
      studentCode: "DH52200005",
      bedNumber: 4,
    },
    {
      id: 5,
      fullName: "Hoàng Bảo Ngọc",
      studentCode: "DH52200007",
      bedNumber: 5,
    },
    {
      id: 6,
      fullName: "Đỗ Hà Vy",
      studentCode: "DH52200008",
      bedNumber: 8,
    },
  ],
};
