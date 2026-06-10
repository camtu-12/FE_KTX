export type ElectricityRecord = {
  id: number;
  room: string;
  studentCount: number;
  month: string;
  oldIndex: number;
  newIndex: number;
  usageKwh: number;
  unitPrice: number;
  totalAmount: number;
};

export const electricityRecords: ElectricityRecord[] = [
  {
    id: 1,
    room: "A101",
    studentCount: 4,
    month: "2026-05",
    oldIndex: 1240,
    newIndex: 1328,
    usageKwh: 88,
    unitPrice: 3500,
    totalAmount: 308000,
  },
  {
    id: 2,
    room: "A102",
    studentCount: 3,
    month: "2026-05",
    oldIndex: 980,
    newIndex: 1062,
    usageKwh: 82,
    unitPrice: 3500,
    totalAmount: 287000,
  },
  {
    id: 3,
    room: "B204",
    studentCount: 4,
    month: "2026-05",
    oldIndex: 1515,
    newIndex: 1620,
    usageKwh: 105,
    unitPrice: 3500,
    totalAmount: 367500,
  },
  {
    id: 4,
    room: "B205",
    studentCount: 2,
    month: "2026-05",
    oldIndex: 870,
    newIndex: 949,
    usageKwh: 79,
    unitPrice: 3500,
    totalAmount: 276500,
  },
  {
    id: 5,
    room: "C301",
    studentCount: 4,
    month: "2026-04",
    oldIndex: 2104,
    newIndex: 2216,
    usageKwh: 112,
    unitPrice: 3500,
    totalAmount: 392000,
  },
];
