export type PaymentStatus = "unpaid" | "paid" | "overdue";

export type RoomFeeBill = {
  id: number;
  studentCode: string;
  fullName: string;
  room: string;
  month: number;
  year: number;
  amount: number;
  createdAt: string;
  dueDate: string;
  status: PaymentStatus;
  paidAt?: string;
};

export const roomFeeBills: RoomFeeBill[] = [
  {
    id: 1,
    studentCode: "DH52300004",
    fullName: "Nguyễn Minh Anh",
    room: "A101",
    month: 6,
    year: 2026,
    amount: 350000,
    createdAt: "2026-06-01",
    dueDate: "2026-06-20",
    status: "unpaid",
  },
  {
    id: 2,
    studentCode: "SV230018",
    fullName: "Trần Gia Huy",
    room: "A102",
    month: 6,
    year: 2026,
    amount: 350000,
    createdAt: "2026-06-01",
    dueDate: "2026-06-20",
    status: "paid",
    paidAt: "2026-06-04",
  },
  {
    id: 3,
    studentCode: "SV230024",
    fullName: "Lê Hoàng Phúc",
    room: "B204",
    month: 6,
    year: 2026,
    amount: 350000,
    createdAt: "2026-06-01",
    dueDate: "2026-05-25",
    status: "overdue",
  },
  {
    id: 4,
    studentCode: "SV230039",
    fullName: "Phạm Thảo Vy",
    room: "B205",
    month: 6,
    year: 2026,
    amount: 350000,
    createdAt: "2026-06-01",
    dueDate: "2026-06-20",
    status: "unpaid",
  },
  {
    id: 5,
    studentCode: "SV230052",
    fullName: "Võ Nhật Nam",
    room: "C301",
    month: 6,
    year: 2026,
    amount: 350000,
    createdAt: "2026-06-01",
    dueDate: "2026-06-20",
    status: "paid",
    paidAt: "2026-06-12",
  },
  {
    id: 6,
    studentCode: "SV230066",
    fullName: "Đặng Ngọc Mai",
    room: "C302",
    month: 6,
    year: 2026,
    amount: 350000,
    createdAt: "2026-06-01",
    dueDate: "2026-06-20",
    status: "overdue",
  },
];
