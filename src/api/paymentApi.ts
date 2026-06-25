import axios from "axios";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const API_ROOT = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

const http = axios.create({
  baseURL: API_ROOT,
  headers: {
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
  },
});

export type PaymentStatus = "unpaid" | "paid" | "overdue";

export type PaymentStudent = {
  id: number;
  studentCode: string;
  fullName: string;
  email: string;
};

export type PaymentRoom = {
  id?: number;
  buildingCode: string;
  floorNumber?: number;
  roomNumber: string;
};

export type RoomFeeBill = {
  id: number;
  studentId: number;
  registrationId: number;
  month: number;
  year: number;
  amount: number;
  createdAt: string;
  dueDate: string;
  paymentMethod: string;
  transactionCode: string;
  paidAt: string;
  status: PaymentStatus;
  student: PaymentStudent | null;
  room: PaymentRoom | null;
};

export type ElectricityBill = {
  id: number;
  studentId: number;
  registrationId: number;
  monthYear: string;
  usageKwh: number;
  unitPrice: number;
  amount: number;
  createdAt: string;
  dueDate: string;
  paymentMethod: string;
  transactionCode: string;
  paidAt: string;
  status: PaymentStatus;
  student: PaymentStudent | null;
  room: PaymentRoom | null;
};

export type ElectricityRecord = {
  id: number;
  roomId: number;
  monthYear: string;
  oldIndex: number;
  newIndex: number;
  usageKwh: number;
  unitPrice: number;
  totalAmount: number;
  createdAt: string;
  room: PaymentRoom | null;
};

export type StudentPaymentItem = {
  id: number;
  source: "room_fee" | "electricity";
  title: string;
  period: string;
  amount: number;
  dueDate: string;
  paymentMethod: string;
  transactionCode: string;
  paidAt: string;
  status: PaymentStatus;
  usageKwh?: number;
  unitPrice?: number;
  room: Pick<PaymentRoom, "buildingCode" | "roomNumber"> | null;
};

export type StudentPaymentSummary = {
  totalAmount: number;
  unpaidAmount: number;
  paidAmount: number;
  overdueAmount: number;
};

export type StudentPayments = {
  student: PaymentStudent | null;
  items: StudentPaymentItem[];
  summary: StudentPaymentSummary;
};

export type VnpayPaymentPayload = {
  source: "room_fee" | "electricity";
  bill_id: number;
  email: string;
};

export type VnpayPaymentLink = {
  paymentUrl: string;
  transactionCode: string;
};

export type PaymentSettings = {
  roomFeePerMonth: number;
  electricityUnitPrice: number;
};

type ApiPaymentSettings = {
  room_fee_per_month?: number | string | null;
  electricity_unit_price?: number | string | null;
};

type ApiStudent = {
  id?: number;
  student_code?: string | null;
  full_name?: string | null;
  email?: string | null;
} | null;

type ApiRoom = {
  id?: number;
  building_code?: string | null;
  floor_number?: number | string | null;
  room_number?: string | number | null;
} | null;

type ApiRoomFeeBill = {
  id: number;
  student_id?: number | string | null;
  registration_id?: number | string | null;
  month?: number | string | null;
  year?: number | string | null;
  amount?: number | string | null;
  created_at?: string | null;
  due_date?: string | null;
  payment_method?: string | null;
  transaction_code?: string | null;
  paid_at?: string | null;
  status?: string | null;
  student?: ApiStudent;
  room?: ApiRoom;
};

type ApiElectricityBill = ApiRoomFeeBill & {
  month_year?: string | null;
  usage_kwh?: number | string | null;
  unit_price?: number | string | null;
};

type ApiElectricityRecord = {
  id: number;
  room_id?: number | string | null;
  month_year?: string | null;
  old_index?: number | string | null;
  new_index?: number | string | null;
  usage_kwh?: number | string | null;
  unit_price?: number | string | null;
  total_amount?: number | string | null;
  created_at?: string | null;
  room?: ApiRoom;
};

type ApiStudentPaymentItem = {
  id: number;
  source?: string | null;
  title?: string | null;
  period?: string | null;
  amount?: number | string | null;
  due_date?: string | null;
  payment_method?: string | null;
  transaction_code?: string | null;
  paid_at?: string | null;
  status?: string | null;
  usage_kwh?: number | string | null;
  unit_price?: number | string | null;
  room?: {
    building_code?: string | null;
    room_number?: string | number | null;
  } | null;
};

type ApiStudentPayments = {
  student?: ApiStudent;
  items?: ApiStudentPaymentItem[];
  summary?: {
    total_amount?: number | string | null;
    unpaid_amount?: number | string | null;
    paid_amount?: number | string | null;
    overdue_amount?: number | string | null;
  };
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStatus = (status: string | null | undefined): PaymentStatus => {
  const value = (status ?? "unpaid").trim().toLowerCase();
  if (value === "paid") return "paid";
  if (value === "overdue") return "overdue";
  return "unpaid";
};

const normalizeStudent = (student: ApiStudent): PaymentStudent | null =>
  student
    ? {
        id: toNumber(student.id),
        studentCode: student.student_code ?? "",
        fullName: student.full_name ?? "",
        email: student.email ?? "",
      }
    : null;

const normalizeRoom = (room: ApiRoom): PaymentRoom | null =>
  room
    ? {
        id: room.id === undefined ? undefined : toNumber(room.id),
        buildingCode: room.building_code ?? "",
        floorNumber: room.floor_number === undefined || room.floor_number === null ? undefined : toNumber(room.floor_number),
        roomNumber: String(room.room_number ?? ""),
      }
    : null;

const normalizeRoomFeeBill = (item: ApiRoomFeeBill): RoomFeeBill => ({
  id: toNumber(item.id),
  studentId: toNumber(item.student_id),
  registrationId: toNumber(item.registration_id),
  month: toNumber(item.month),
  year: toNumber(item.year),
  amount: toNumber(item.amount),
  createdAt: item.created_at ?? "",
  dueDate: item.due_date ?? "",
  paymentMethod: item.payment_method ?? "",
  transactionCode: item.transaction_code ?? "",
  paidAt: item.paid_at ?? "",
  status: normalizeStatus(item.status),
  student: normalizeStudent(item.student ?? null),
  room: normalizeRoom(item.room ?? null),
});

const normalizeElectricityBill = (item: ApiElectricityBill): ElectricityBill => ({
  id: toNumber(item.id),
  studentId: toNumber(item.student_id),
  registrationId: toNumber(item.registration_id),
  monthYear: item.month_year ?? "",
  usageKwh: toNumber(item.usage_kwh),
  unitPrice: toNumber(item.unit_price),
  amount: toNumber(item.amount),
  createdAt: item.created_at ?? "",
  dueDate: item.due_date ?? "",
  paymentMethod: item.payment_method ?? "",
  transactionCode: item.transaction_code ?? "",
  paidAt: item.paid_at ?? "",
  status: normalizeStatus(item.status),
  student: normalizeStudent(item.student ?? null),
  room: normalizeRoom(item.room ?? null),
});

const normalizeElectricityRecord = (item: ApiElectricityRecord): ElectricityRecord => ({
  id: toNumber(item.id),
  roomId: toNumber(item.room_id),
  monthYear: item.month_year ?? "",
  oldIndex: toNumber(item.old_index),
  newIndex: toNumber(item.new_index),
  usageKwh: toNumber(item.usage_kwh),
  unitPrice: toNumber(item.unit_price),
  totalAmount: toNumber(item.total_amount),
  createdAt: item.created_at ?? "",
  room: normalizeRoom(item.room ?? null),
});

const normalizePaymentSettings = (item: ApiPaymentSettings): PaymentSettings => ({
  roomFeePerMonth: toNumber(item.room_fee_per_month) || 350000,
  electricityUnitPrice: toNumber(item.electricity_unit_price) || 2900,
});

export const getPaymentSettings = async (): Promise<PaymentSettings> => {
  const response = await http.get<ApiPaymentSettings>("/payment-settings");
  return normalizePaymentSettings(response.data);
};

export const updatePaymentSettings = async (payload: {
  room_fee_per_month?: number;
  electricity_unit_price?: number;
}): Promise<PaymentSettings> => {
  const response = await http.put<ApiPaymentSettings>("/payment-settings", payload);
  return normalizePaymentSettings(response.data);
};

export const listRoomFeeBills = async (): Promise<RoomFeeBill[]> => {
  const response = await http.get<ApiRoomFeeBill[]>("/room-fee-bills");
  return Array.isArray(response.data) ? response.data.map(normalizeRoomFeeBill) : [];
};

export const generateRoomFeeBills = async (payload: {
  month: number;
  year: number;
  amount: number;
  due_date: string;
}): Promise<{ createdCount: number; skippedCount: number; items: RoomFeeBill[] }> => {
  const response = await http.post<{ created_count?: number; skipped_count?: number; items?: ApiRoomFeeBill[] }>(
    "/room-fee-bills/generate",
    payload,
  );
  return {
    createdCount: toNumber(response.data.created_count),
    skippedCount: toNumber(response.data.skipped_count),
    items: Array.isArray(response.data.items) ? response.data.items.map(normalizeRoomFeeBill) : [],
  };
};

export const confirmRoomFeePayment = async (
  id: number,
  payload: { payment_method: string; transaction_code?: string; paid_at?: string },
): Promise<RoomFeeBill> => {
  const response = await http.put<ApiRoomFeeBill>(`/room-fee-bills/${id}/confirm-payment`, payload);
  return normalizeRoomFeeBill(response.data);
};

export const listElectricityBills = async (): Promise<ElectricityBill[]> => {
  const response = await http.get<ApiElectricityBill[]>("/electricity-bills");
  return Array.isArray(response.data) ? response.data.map(normalizeElectricityBill) : [];
};

export const listElectricityRecords = async (): Promise<ElectricityRecord[]> => {
  const response = await http.get<ApiElectricityRecord[]>("/electricity-records");
  return Array.isArray(response.data) ? response.data.map(normalizeElectricityRecord) : [];
};

export const generateElectricityBills = async (payload: {
  room_id: number;
  month_year: string;
  old_index: number;
  new_index: number;
  unit_price: number;
  due_date: string;
}): Promise<{ createdCount: number; skippedCount: number; record: ElectricityRecord | null; items: ElectricityBill[] }> => {
  const response = await http.post<{
    created_count?: number;
    skipped_count?: number;
    record?: ApiElectricityRecord;
    items?: ApiElectricityBill[];
  }>("/electricity-records/generate", payload);

  return {
    createdCount: toNumber(response.data.created_count),
    skippedCount: toNumber(response.data.skipped_count),
    record: response.data.record ? normalizeElectricityRecord(response.data.record) : null,
    items: Array.isArray(response.data.items) ? response.data.items.map(normalizeElectricityBill) : [],
  };
};

export const confirmElectricityPayment = async (
  id: number,
  payload: { payment_method: string; transaction_code?: string; paid_at?: string },
): Promise<ElectricityBill> => {
  const response = await http.put<ApiElectricityBill>(`/electricity-bills/${id}/confirm-payment`, payload);
  return normalizeElectricityBill(response.data);
};

export const getStudentPayments = async (email: string): Promise<StudentPayments> => {
  const response = await http.get<ApiStudentPayments>("/student/payments", {
    params: { email },
  });

  const items = Array.isArray(response.data.items)
    ? response.data.items.map((item): StudentPaymentItem => ({
        id: toNumber(item.id),
        source: item.source === "electricity" ? "electricity" : "room_fee",
        title: item.title ?? "",
        period: item.period ?? "",
        amount: toNumber(item.amount),
        dueDate: item.due_date ?? "",
        paymentMethod: item.payment_method ?? "",
        transactionCode: item.transaction_code ?? "",
        paidAt: item.paid_at ?? "",
        status: normalizeStatus(item.status),
        usageKwh: item.usage_kwh === undefined || item.usage_kwh === null ? undefined : toNumber(item.usage_kwh),
        unitPrice: item.unit_price === undefined || item.unit_price === null ? undefined : toNumber(item.unit_price),
        room: item.room
          ? {
              buildingCode: item.room.building_code ?? "",
              roomNumber: String(item.room.room_number ?? ""),
            }
          : null,
      }))
    : [];

  return {
    student: normalizeStudent(response.data.student ?? null),
    items,
    summary: {
      totalAmount: toNumber(response.data.summary?.total_amount),
      unpaidAmount: toNumber(response.data.summary?.unpaid_amount),
      paidAmount: toNumber(response.data.summary?.paid_amount),
      overdueAmount: toNumber(response.data.summary?.overdue_amount),
    },
  };
};

export const createVnpayPayment = async (payload: VnpayPaymentPayload): Promise<VnpayPaymentLink> => {
  const response = await http.post<{ payment_url?: string; transaction_code?: string }>("/payments/vnpay/create", payload);

  return {
    paymentUrl: response.data.payment_url ?? "",
    transactionCode: response.data.transaction_code ?? "",
  };
};

export const verifyVnpayPayment = async (payload: Record<string, string>): Promise<{ success: boolean; message: string }> => {
  const response = await http.post<{ success?: boolean; message?: string }>("/payments/vnpay/verify", payload);

  return {
    success: Boolean(response.data.success),
    message: response.data.message ?? "",
  };
};
