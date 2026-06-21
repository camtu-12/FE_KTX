import { API } from "./registrationApi";
import type { OccupancyPeriod } from "./occupancyPeriodApi";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExtensionStatus = "pending" | "approved" | "rejected";

export type OccupancyExtension = {
  id: number;
  occupancy_id: number;
  student_id: number;
  occupancy_period_id: number;
  reason: string;
  status: ExtensionStatus;
  admin_note: string | null;
  requested_at: string;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  occupancy?: {
    id: number;
    status: string;
    check_in_date: string | null;
    check_out_date: string | null;
    room: { id: number; room_number: string; floor_number?: number | null; building_name?: string | null } | null;
    bed: { id: number; bed_number: number } | null;
  } | null;
  student?: {
    id: number;
    student_code: string;
    full_name: string;
    email: string;
    phone: string;
    class_name: string;
    faculty: string;
  } | null;
  occupancy_period?: {
    id: number;
    name: string;
    end_date: string | null;
    extension_until_date: string | null;
  } | null;
};

export type ExtensionStats = {
  active_extension_period: {
    id: number;
    name: string;
    end_date: string | null;
    extension_until_date: string | null;
  } | null;
  expiring_soon: number;
  extension_submitted: number;
  extension_not_submitted: number;
  extension_approved: number;
  extension_rejected: number;
  days_window: number;
};

export type EligibilityConditions = {
  studying: boolean;
  no_debt: boolean;
  no_serious_violation: boolean;
  medium_violations_ok: boolean;
  minor_violations_ok: boolean;
  not_final_year: boolean;
};

export type ExtensionEligibility = {
  eligible: boolean;
  branch: "A" | "B" | null;
  has_active_occupancy: boolean;
  has_open_period: boolean;
  already_submitted: boolean;
  conditions: EligibilityConditions;
  serious_violation_count: number;
  medium_violation_count: number;
  minor_violation_count: number;
};

export type StoreExtensionPayload = {
  email?: string;
  student_id?: number;
  reason: string;
};

export type ProcessExtensionPayload = {
  admin_note?: string;
};

// Re-export for convenience
export type { OccupancyPeriod as ActiveExtensionPeriod };

// ─── Student API ─────────────────────────────────────────────────────────────

export const checkExtensionEligibility = (email: string): Promise<ExtensionEligibility> =>
  API.get("/student/extensions/eligibility", { params: { email } }).then(
    (res) => res.data as ExtensionEligibility,
  );

export const getActiveExtensionPeriod = (): Promise<OccupancyPeriod | null> =>
  API.get("/occupancy-periods").then((res) => {
    const list = res.data as OccupancyPeriod[];
    return list.find((p) => p.status === "open") ?? null;
  });

export const getMyExtensions = (email: string): Promise<OccupancyExtension[]> =>
  API.get("/student/extensions", { params: { email } }).then((res) => res.data as OccupancyExtension[]);

export const submitExtension = (payload: StoreExtensionPayload): Promise<OccupancyExtension> =>
  API.post("/student/extensions", payload).then((res) => res.data as OccupancyExtension);

// ─── Admin API ────────────────────────────────────────────────────────────────

export const getExtensionStats = (): Promise<ExtensionStats> =>
  API.get("/admin/extensions/stats").then((res) => res.data as ExtensionStats);

export const getAdminExtensions = (params?: {
  status?: ExtensionStatus;
  occupancy_period_id?: number;
  search?: string;
}): Promise<OccupancyExtension[]> =>
  API.get("/admin/extensions", { params }).then((res) => res.data as OccupancyExtension[]);

export const getAdminExtension = (id: number): Promise<OccupancyExtension> =>
  API.get(`/admin/extensions/${id}`).then((res) => res.data as OccupancyExtension);

export const approveExtension = (id: number, payload?: ProcessExtensionPayload): Promise<OccupancyExtension> =>
  API.put(`/admin/extensions/${id}/approve`, payload ?? {}).then((res) => res.data as OccupancyExtension);

export const rejectExtension = (id: number, payload?: ProcessExtensionPayload): Promise<OccupancyExtension> =>
  API.put(`/admin/extensions/${id}/reject`, payload ?? {}).then((res) => res.data as OccupancyExtension);
