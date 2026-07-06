import apiClient from "../lib/apiClient";

export type StudentInfo = {
  id: number;
  student_code: string;
  full_name: string;
  email: string;
  avatar: string | null;
  class_name: string;
  faculty: string;
};

export type OccupancyRoom = {
  building_code: string | null;
  floor_number: number | null;
  room_number: string;
};

export type CurrentOccupancy = {
  id: number;
  status: "ACTIVE" | "ROOM_CONFIRMED";
  check_in_date: string | null;
  check_out_date: string | null;
  total_days: number | null;
  days_left: number | null;
  room: OccupancyRoom | null;
  bed: { bed_number: string } | null;
};

export type InvoiceItem = {
  amount: number;
  status: "paid" | "unpaid" | "overdue";
  period?: string;
  usage_kwh?: number;
};

export type CurrentInvoice = {
  room_fee: InvoiceItem | null;
  electricity: InvoiceItem | null;
  overdue_amount: number;
};

export type DashboardNotification = {
  recipient_id: number;
  id: number;
  title: string;
  type: string;
  created_at: string;
  is_read: boolean;
};

export type PendingRequest = {
  id: number;
  title: string;
  request_type: string;
  status: "pending" | "processing";
  created_at: string;
};

export type RecentActivity = {
  id: number;
  date: string;
  note: string | null;
  action_taken: string | null;
  type: {
    name: string;
    category: "positive" | "negative";
    level: string;
  } | null;
};

export type ActivePeriod = {
  id: number;
  name: string;
  end_date: string;
  days_left: number;
};

export type LatestRegistration = {
  id: number;
  status: "submitted" | "approved" | "rejected";
  rejection_reason: string | null;
  assigned_room_id: number | null;
  bed_id: number | null;
  bed_approval_status: "pending" | "approved" | "rejected" | null;
  occupancy_status: string | null;
};

export type StudentDashboardData = {
  student: StudentInfo;
  current_occupancy: CurrentOccupancy | null;
  current_invoice: CurrentInvoice | null;
  latest_registration: LatestRegistration | null;
  notifications: DashboardNotification[];
  pending_requests: PendingRequest[];
  recent_activities: RecentActivity[];
  active_registration_period: ActivePeriod | null;
};

export async function fetchStudentDashboard(): Promise<StudentDashboardData> {
  const { data } = await apiClient.get<StudentDashboardData>("/student/dashboard");
  return data;
}
