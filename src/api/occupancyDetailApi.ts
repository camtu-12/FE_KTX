import apiClient from "../lib/apiClient";

export type OccupancyHistoryItem = {
  id: number;
  school_year: string | null;
  semester: string | null;
  period_name: string | null;
  building_code: string;
  floor_number: number | null;
  room_number: string;
  bed_number: string;
  check_in_date: string | null;
  check_out_date: string | null;
  status: string;
  is_current: boolean;
};

export type RecentViolation = {
  id: number;
  type_name: string;
  level: string;
  activity_date: string;
  note: string;
  action_taken: string | null;
};

export type CurrentInvoice = {
  id: number;
  month: number;
  year: number;
  amount: number;
  status: string;
  due_date: string | null;
};

export type SupportRequest = {
  id: number;
  title: string | null;
  status: string;
  created_at: string | null;
};

export type RoomChangeHistoryItem = {
  id: number;
  change_type: string;
  change_source: string;
  transfer_reason: string | null;
  is_temporary: boolean;
  transferred_at: string | null;
  old_room_code: string | null;
  old_bed_number: string | null;
  new_room_code: string | null;
  new_bed_number: string | null;
};

export type OccupancyDetail = {
  student: {
    avatar: string | null;
    permanent_address: string | null;
    previous_address: string | null;
    current_year: number | null;
  };
  family: {
    father_name: string | null;
    father_birth_year: string | null;
    father_phone: string | null;
    father_occupation: string | null;
    mother_name: string | null;
    mother_birth_year: string | null;
    mother_phone: string | null;
    mother_occupation: string | null;
    parent_address: string | null;
  };
  occupancy_history: OccupancyHistoryItem[];
  recent_violations: RecentViolation[];
  current_invoice: CurrentInvoice | null;
  total_debt: number;
  unpaid_debt: number;
  cancelled_checkout_request: {
    id: number;
    cancelled_at: string | null;
  } | null;
  support_requests: SupportRequest[];
  room_change_history: RoomChangeHistoryItem[];
};

export const fetchOccupancyDetail = async (occupancyId: number): Promise<OccupancyDetail> => {
  const res = await apiClient.get<OccupancyDetail>(`/admin/occupancies/${occupancyId}/detail`);
  return res.data;
};
