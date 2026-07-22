import apiClient from "../lib/apiClient";

export type PaymentStatus = "unpaid" | "paid" | "overdue" | "exempted";

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
  isQuarterly: boolean;
  amount: number;
  originalAmount: number | null;
  discountPercent: number | null;
  discountAmount: number;
  discountReason: string | null;
  adminNote: string | null;
  exemptedBy: string | null;
  exemptedAt: string | null;
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
  isQuarterly?: boolean;
  amount: number;
  originalAmount?: number | null;
  discountPercent?: number | null;
  discountAmount?: number;
  discountReason?: string | null;
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
  is_quarterly?: boolean | null;
  amount?: number | string | null;
  original_amount?: number | string | null;
  discount_percent?: number | string | null;
  discount_amount?: number | string | null;
  discount_reason?: string | null;
  admin_note?: string | null;
  exempted_by?: string | null;
  exempted_at?: string | null;
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
  is_quarterly?: boolean | null;
  amount?: number | string | null;
  original_amount?: number | string | null;
  discount_percent?: number | string | null;
  discount_amount?: number | string | null;
  discount_reason?: string | null;
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
  if (value === "exempted") return "exempted";
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
  isQuarterly: item.is_quarterly !== false,
  amount: toNumber(item.amount),
  originalAmount: item.original_amount != null ? toNumber(item.original_amount) : null,
  discountPercent: item.discount_percent != null ? toNumber(item.discount_percent) : null,
  discountAmount: toNumber(item.discount_amount),
  discountReason: item.discount_reason ?? null,
  adminNote: item.admin_note ?? null,
  exemptedBy: item.exempted_by ?? null,
  exemptedAt: item.exempted_at ?? null,
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
  const response = await apiClient.get<ApiPaymentSettings>("/payment-settings");
  return normalizePaymentSettings(response.data);
};

export const updatePaymentSettings = async (payload: {
  room_fee_per_month?: number;
  electricity_unit_price?: number;
}): Promise<PaymentSettings> => {
  const response = await apiClient.put<ApiPaymentSettings>("/payment-settings", payload);
  return normalizePaymentSettings(response.data);
};

export const listRoomFeeBills = async (): Promise<RoomFeeBill[]> => {
  const response = await apiClient.get<ApiRoomFeeBill[]>("/room-fee-bills");
  return Array.isArray(response.data) ? response.data.map(normalizeRoomFeeBill) : [];
};

export const generateRoomFeeBills = async (payload: {
  month: number;
  year: number;
  amount: number;
  due_date: string;
}): Promise<{ createdCount: number; skippedCount: number; items: RoomFeeBill[] }> => {
  const response = await apiClient.post<{ created_count?: number; skipped_count?: number; items?: ApiRoomFeeBill[] }>(
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
  const response = await apiClient.put<ApiRoomFeeBill>(`/room-fee-bills/${id}/confirm-payment`, payload);
  return normalizeRoomFeeBill(response.data);
};

export const exemptRoomFeeBill = async (id: number, payload: { admin_note?: string; exempted_by?: string }): Promise<RoomFeeBill> => {
  const response = await apiClient.put<ApiRoomFeeBill>(`/room-fee-bills/${id}/exempt`, payload);
  return normalizeRoomFeeBill(response.data);
};

export const applyOneTimeDiscount = async (
  id: number,
  payload: { discount_percent: number; reason?: string },
): Promise<RoomFeeBill> => {
  const response = await apiClient.put<ApiRoomFeeBill>(`/room-fee-bills/${id}/apply-discount`, payload);
  return normalizeRoomFeeBill(response.data);
};

export type PaymentPlanType = "installment" | "discount";

export type StudentPaymentPlan = {
  id: number;
  studentId: number;
  type: PaymentPlanType;
  isActive: boolean;
  discountPercent: number | null;
  reason: string | null;
  activatedAt: string | null;
  deactivatedAt: string | null;
};

type ApiStudentPaymentPlan = {
  id: number;
  student_id?: number | string | null;
  type?: string | null;
  is_active?: boolean | number | null;
  discount_percent?: number | string | null;
  reason?: string | null;
  activated_at?: string | null;
  deactivated_at?: string | null;
};

const normalizePaymentPlan = (item: ApiStudentPaymentPlan): StudentPaymentPlan => ({
  id: toNumber(item.id),
  studentId: toNumber(item.student_id),
  type: item.type === "discount" ? "discount" : "installment",
  isActive: Boolean(item.is_active),
  discountPercent: item.discount_percent != null ? toNumber(item.discount_percent) : null,
  reason: item.reason ?? null,
  activatedAt: item.activated_at ?? null,
  deactivatedAt: item.deactivated_at ?? null,
});

export const listStudentPaymentPlans = async (studentId: number): Promise<StudentPaymentPlan[]> => {
  const response = await apiClient.get<ApiStudentPaymentPlan[]>(`/admin/students/${studentId}/payment-plans`);
  return Array.isArray(response.data) ? response.data.map(normalizePaymentPlan) : [];
};

export const createStudentPaymentPlan = async (
  studentId: number,
  payload: { type: PaymentPlanType; discount_percent?: number; reason?: string },
): Promise<StudentPaymentPlan> => {
  const response = await apiClient.post<ApiStudentPaymentPlan>(`/admin/students/${studentId}/payment-plans`, payload);
  return normalizePaymentPlan(response.data);
};

export const deactivateStudentPaymentPlan = async (id: number): Promise<StudentPaymentPlan> => {
  const response = await apiClient.put<ApiStudentPaymentPlan>(`/admin/payment-plans/${id}/deactivate`, {});
  return normalizePaymentPlan(response.data);
};

export const confirmFreeRoomFeeBill = async (id: number): Promise<StudentPaymentItem> => {
  const response = await apiClient.post<ApiStudentPaymentItem>(`/student/payments/room-fee-bills/${id}/confirm-free`);
  const item = response.data;
  return {
    id: toNumber(item.id),
    source: "room_fee",
    title: item.title ?? "",
    period: item.period ?? "",
    isQuarterly: item.is_quarterly !== false,
    amount: toNumber(item.amount),
    originalAmount: item.original_amount != null ? toNumber(item.original_amount) : null,
    discountPercent: item.discount_percent != null ? toNumber(item.discount_percent) : null,
    discountAmount: toNumber(item.discount_amount),
    discountReason: item.discount_reason ?? null,
    dueDate: item.due_date ?? "",
    paymentMethod: item.payment_method ?? "",
    transactionCode: item.transaction_code ?? "",
    paidAt: item.paid_at ?? "",
    status: normalizeStatus(item.status),
    room: item.room ? { buildingCode: item.room.building_code ?? "", roomNumber: String(item.room.room_number ?? "") } : null,
  };
};

export const listElectricityBills = async (): Promise<ElectricityBill[]> => {
  const response = await apiClient.get<ApiElectricityBill[]>("/electricity-bills");
  return Array.isArray(response.data) ? response.data.map(normalizeElectricityBill) : [];
};

export const listElectricityRecords = async (): Promise<ElectricityRecord[]> => {
  const response = await apiClient.get<ApiElectricityRecord[]>("/electricity-records");
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
  const response = await apiClient.post<{
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
  const response = await apiClient.put<ApiElectricityBill>(`/electricity-bills/${id}/confirm-payment`, payload);
  return normalizeElectricityBill(response.data);
};

export const getStudentPayments = async (): Promise<StudentPayments> => {
  const response = await apiClient.get<ApiStudentPayments>("/student/payments");

  const items = Array.isArray(response.data.items)
    ? response.data.items.map((item): StudentPaymentItem => ({
        id: toNumber(item.id),
        source: item.source === "electricity" ? "electricity" : "room_fee",
        title: item.title ?? "",
        period: item.period ?? "",
        isQuarterly: item.is_quarterly !== false,
        amount: toNumber(item.amount),
        originalAmount: item.original_amount != null ? toNumber(item.original_amount) : null,
        discountPercent: item.discount_percent != null ? toNumber(item.discount_percent) : null,
        discountAmount: toNumber(item.discount_amount),
        discountReason: item.discount_reason ?? null,
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
  const response = await apiClient.post<{ payment_url?: string; transaction_code?: string }>("/payments/vnpay/create", payload);

  return {
    paymentUrl: response.data.payment_url ?? "",
    transactionCode: response.data.transaction_code ?? "",
  };
};

export const verifyVnpayPayment = async (payload: Record<string, string>): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success?: boolean; message?: string }>("/payments/vnpay/verify", payload);

  return {
    success: Boolean(response.data.success),
    message: response.data.message ?? "",
  };
};
