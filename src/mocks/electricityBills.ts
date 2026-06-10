import type { PaymentStatus } from "./roomFeeBills";

export type ElectricityBill = {
  id: number;
  studentCode: string;
  fullName: string;
  room: string;
  month: string;
  amount: number;
  createdAt: string;
  dueDate: string;
  status: PaymentStatus;
  paidAt?: string;
};

export const electricityBills: ElectricityBill[] = [
  {
    id: 1,
    studentCode: "SV230001",
    fullName: "Nguyễn Minh Anh",
    room: "A101",
    month: "2026-05",
    amount: 77000,
    createdAt: "2026-06-01",
    dueDate: "2026-06-15",
    status: "unpaid",
  },
  {
    id: 2,
    studentCode: "SV23001800",
    fullName: "Trần Gia Huy",
    room: "A102",
    month: "2026-05",
    amount: 71750,
    createdAt: "2026-06-01",
    dueDate: "2026-06-15",
    status: "paid",
    paidAt: "2026-06-07",
  },
  {
    id: 3,
    studentCode: "SV230024",
    fullName: "Lê Hoàng Phúc",
    room: "B204",
    month: "2026-05",
    amount: 91875,
    createdAt: "2026-06-01",
    dueDate: "2026-06-01",
    status: "overdue",
  },
  {
    id: 4,
    studentCode: "SV230039",
    fullName: "Phạm Thảo Vy",
    room: "B205",
    month: "2026-05",
    amount: 69125,
    createdAt: "2026-06-01",
    dueDate: "2026-06-15",
    status: "unpaid",
  },
  {
    id: 5,
    studentCode: "SV230052",
    fullName: "Võ Nhật Nam",
    room: "C301",
    month: "2026-04",
    amount: 98000,
    createdAt: "2026-05-01",
    dueDate: "2026-05-15",
    status: "paid",
    paidAt: "2026-05-11",
  },
  
];
