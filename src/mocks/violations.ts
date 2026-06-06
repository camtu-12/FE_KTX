export type ViolationStatus = "PENDING" | "RESOLVED";
export type ViolationAction = "WARNING" | "FORCED_CHECKOUT";

export type Violation = {
  id: number;
  occupancyId: number;
  typeId: number;
  violationDate: string;
  status: ViolationStatus;
  actionTaken: ViolationAction | null;
  note: string;
};

export const violations: Violation[] = [
  {
    id: 1,
    occupancyId: 1,
    typeId: 1,
    violationDate: "2026-05-20",
    status: "PENDING",
    actionTaken: null,
    note: "Bi nhac nho vi gay on trong phong sau 23h.",
  },
  {
    id: 2,
    occupancyId: 2,
    typeId: 7,
    violationDate: "2026-05-18",
    status: "RESOLVED",
    actionTaken: "WARNING",
    note: "Su dung am dun nuoc trong phong, da cam ket khong tai pham.",
  },
  {
    id: 3,
    occupancyId: 3,
    typeId: 3,
    violationDate: "2026-05-16",
    status: "RESOLVED",
    actionTaken: "FORCED_CHECKOUT",
    note: "Dua nguoi ngoai vao phong qua dem khi chua duoc phep.",
  },
  {
    id: 4,
    occupancyId: 5,
    typeId: 5,
    violationDate: "2026-05-12",
    status: "PENDING",
    actionTaken: null,
    note: "Khong tham gia lich ve sinh phong trong hai tuan lien tiep.",
  },
  {
    id: 5,
    occupancyId: 6,
    typeId: 4,
    violationDate: "2026-05-10",
    status: "RESOLVED",
    actionTaken: "FORCED_CHECKOUT",
    note: "Lam hong cua tu ca nhan va khong phoi hop xu ly ban giao.",
  },
  {
    id: 6,
    occupancyId: 7,
    typeId: 9,
    violationDate: "2026-05-08",
    status: "RESOLVED",
    actionTaken: "WARNING",
    note: "Ve muon sau gio dong cong lan dau.",
  },
  {
    id: 7,
    occupancyId: 8,
    typeId: 2,
    violationDate: "2026-05-04",
    status: "PENDING",
    actionTaken: null,
    note: "Tu y doi giuong voi ban cung phong khi chua dang ky lai.",
  },
  {
    id: 8,
    occupancyId: 9,
    typeId: 10,
    violationDate: "2026-04-30",
    status: "RESOLVED",
    actionTaken: "FORCED_CHECKOUT",
    note: "Qua han thanh toan tien phong va tien dien sau nhieu lan thong bao.",
  },
  {
    id: 9,
    occupancyId: 11,
    typeId: 6,
    violationDate: "2026-04-24",
    status: "RESOLVED",
    actionTaken: "WARNING",
    note: "Hut thuoc tai hanh lang tang 2.",
  },
  {
    id: 10,
    occupancyId: 13,
    typeId: 8,
    violationDate: "2026-04-18",
    status: "PENDING",
    actionTaken: null,
    note: "Can lam viec lai voi sinh vien ve su viec xay ra tai khu sinh hoat chung.",
  },
];
