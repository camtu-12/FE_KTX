import apiClient from "../lib/apiClient";

export type DashboardStats = {
  total_students: number;
  total_capacity: number;
  male_count: number;
  female_count: number;
  pending_registrations: number;
  occupied_rooms: number;
  total_rooms: number;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  maintenance_beds: number;
};

export type PendingRegistrationsBreakdown = {
  main: { pending: number; review: number };
  rolling: { pending: number; review: number };
};

export type DashboardAlerts = {
  overdue_invoices: number;
  pending_registrations: number;
  pending_registrations_breakdown: PendingRegistrationsBreakdown;
  expiring_occupancies_30d: number;
  pending_bed_selection: number;
  pending_room_changes: number;
  pending_bed_changes: number;
  pending_checkouts: number;
  pending_support_requests: number;
};

export type DashboardPeriod = {
  id: number;
  name: string;
  status: "pending" | "active" | "processing" | "closed";
  channel: "main" | "rolling";
  school_year: string;
  semester: string;
  start_date: string;
  end_date: string;
  days_left: number | null;
  registrations: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  room_assignment: {
    not_assigned: number;
    proposed: number;
    room_confirmed: number;
    active: number;
  };
} | null;

export type DashboardQueueStatus = {
  pending_jobs: number;
  failed_jobs: number;
};

export type DashboardData = {
  stats: DashboardStats;
  alerts: DashboardAlerts;
  queue: DashboardQueueStatus;
  current_period: DashboardPeriod;
  charts: {
    by_faculty: Array<{ faculty: string; male: number; female: number; total: number }>;
    by_year: Array<{ year: number; male: number; female: number; total: number }>;
    by_province: Array<{ province: string; count: number }>;
    by_gender?: Array<{ gender: string; count: number }>;
  };
  finance: DashboardFinance;
};

export type DashboardRevenueTrendItem = {
  month: number;
  year: number;
  label: string;
  short_label: string;
  room_total: number;
  electricity_total: number;
  total: number;
};

export type DashboardFinance = {
  month?: number;
  year?: number;
  available_years?: number[];
  expected_total: number;
  collected: number;
  debt: number;
  debtors_count: number;
  room_expected_total?: number;
  room_collected?: number;
  room_debt?: number;
  electricity_expected_total?: number;
  electricity_collected?: number;
  electricity_debt?: number;
};

export async function fetchDashboard(): Promise<DashboardData> {
  const response = await apiClient.get<DashboardData>("/admin/dashboard");
  console.log("Dashboard Overview Response:", response.data);
  return response.data;
}

export async function fetchDashboardFinance(month: number, year: number): Promise<DashboardFinance> {
  const { data } = await apiClient.get<DashboardFinance>("/admin/dashboard/finance", {
    params: { month, year },
  });
  return data;
}

export async function fetchDashboardRevenueTrend(
  month: number,
  year: number,
): Promise<DashboardRevenueTrendItem[]> {
  const { data } = await apiClient.get<DashboardRevenueTrendItem[]>("/admin/dashboard/revenue-trend", {
    params: { month, year },
  });
  return data;
}
