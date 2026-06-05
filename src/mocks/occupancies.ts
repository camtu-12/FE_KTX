export type OccupancyStatus =
  | "ACTIVE"
  | "CHECKOUT_REQUESTED"
  | "CHECKED_OUT"
  | "FORCED_CHECKOUT";

export type OccupancyLeaveRequest = {
  requestedAt: string;
  expectedLeaveDate: string;
  reason: string;
  note?: string;
};

export type Occupancy = {
  id: number;
  studentId: number;
  roomId: number;
  bedId: number;
  buildingCode: string;
  floorNumber: number;
  roomNumber: string;
  bedNumber: string;
  checkInDate: string;
  status: OccupancyStatus;
  leaveRequest?: OccupancyLeaveRequest;
  forcedCheckoutReason?: string;
};

export const occupancies: Occupancy[] = [
  {
    id: 1,
    studentId: 101,
    roomId: 1,
    bedId: 101,
    buildingCode: "A",
    floorNumber: 1,
    roomNumber: "101",
    bedNumber: "1",
    checkInDate: "2026-01-08",
    status: "ACTIVE",
  },
  {
    id: 2,
    studentId: 102,
    roomId: 26,
    bedId: 2602,
    buildingCode: "B",
    floorNumber: 2,
    roomNumber: "203",
    bedNumber: "2",
    checkInDate: "2026-01-10",
    status: "ACTIVE",
  },
  {
    id: 3,
    studentId: 103,
    roomId: 24,
    bedId: 2407,
    buildingCode: "B",
    floorNumber: 2,
    roomNumber: "201",
    bedNumber: "7",
    checkInDate: "2026-01-12",
    status: "ACTIVE",
  },
  {
    id: 4,
    studentId: 104,
    roomId: 30,
    bedId: 3004,
    buildingCode: "C",
    floorNumber: 3,
    roomNumber: "305",
    bedNumber: "4",
    checkInDate: "2026-01-15",
    status: "CHECKED_OUT",
  },
  {
    id: 5,
    studentId: 105,
    roomId: 14,
    bedId: 1403,
    buildingCode: "A",
    floorNumber: 2,
    roomNumber: "204",
    bedNumber: "3",
    checkInDate: "2026-01-18",
    status: "ACTIVE",
  },
  {
    id: 6,
    studentId: 106,
    roomId: 31,
    bedId: 3108,
    buildingCode: "C",
    floorNumber: 4,
    roomNumber: "401",
    bedNumber: "8",
    checkInDate: "2026-01-20",
    status: "FORCED_CHECKOUT",
    forcedCheckoutReason: "Vi phạm nội quy ký túc xá nhiều lần.",
  },
  {
    id: 7,
    studentId: 107,
    roomId: 21,
    bedId: 2105,
    buildingCode: "B",
    floorNumber: 1,
    roomNumber: "102",
    bedNumber: "5",
    checkInDate: "2026-01-22",
    status: "ACTIVE",
  },
  {
    id: 8,
    studentId: 108,
    roomId: 18,
    bedId: 1806,
    buildingCode: "A",
    floorNumber: 3,
    roomNumber: "302",
    bedNumber: "6",
    checkInDate: "2026-01-25",
    status: "CHECKOUT_REQUESTED",
    leaveRequest: {
      requestedAt: "2026-06-05",
      expectedLeaveDate: "2026-06-15",
      reason: "Chuyển nơi ở gần trường hơn",
      note: "Đã hoàn thành học phí và muốn chuyển ra ngoài ở cùng người thân",
    },
  },
  {
    id: 9,
    studentId: 109,
    roomId: 20,
    bedId: 2001,
    buildingCode: "B",
    floorNumber: 1,
    roomNumber: "103",
    bedNumber: "1",
    checkInDate: "2026-02-01",
    status: "ACTIVE",
  },
  {
    id: 10,
    studentId: 110,
    roomId: 25,
    bedId: 2502,
    buildingCode: "B",
    floorNumber: 2,
    roomNumber: "206",
    bedNumber: "2",
    checkInDate: "2026-02-03",
    status: "CHECKED_OUT",
  },
  {
    id: 11,
    studentId: 111,
    roomId: 11,
    bedId: 1109,
    buildingCode: "A",
    floorNumber: 2,
    roomNumber: "202",
    bedNumber: "9",
    checkInDate: "2026-02-05",
    status: "ACTIVE",
  },
  {
    id: 12,
    studentId: 112,
    roomId: 32,
    bedId: 3210,
    buildingCode: "B",
    floorNumber: 4,
    roomNumber: "404",
    bedNumber: "10",
    checkInDate: "2026-02-08",
    status: "CHECKOUT_REQUESTED",
    leaveRequest: {
      requestedAt: "2026-06-04",
      expectedLeaveDate: "2026-06-12",
      reason: "Gia đình chuyển chỗ ở nên không tiếp tục lưu trú tại ký túc xá.",
      note: "Sinh viên sẽ hoàn tất bàn giao phòng trước ngày rời KTX.",
    },
  },
  {
    id: 13,
    studentId: 113,
    roomId: 33,
    bedId: 3303,
    buildingCode: "C",
    floorNumber: 1,
    roomNumber: "105",
    bedNumber: "3",
    checkInDate: "2026-02-10",
    status: "ACTIVE",
  },
  {
    id: 14,
    studentId: 114,
    roomId: 34,
    bedId: 3405,
    buildingCode: "C",
    floorNumber: 3,
    roomNumber: "303",
    bedNumber: "5",
    checkInDate: "2026-02-12",
    status: "FORCED_CHECKOUT",
    forcedCheckoutReason: "Không hoàn thành nghĩa vụ lưu trú theo quy định.",
  },
  {
    id: 15,
    studentId: 115,
    roomId: 15,
    bedId: 1506,
    buildingCode: "A",
    floorNumber: 2,
    roomNumber: "206",
    bedNumber: "6",
    checkInDate: "2026-02-15",
    status: "ACTIVE",
  },
];
