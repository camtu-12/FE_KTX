import apiClient from "../lib/apiClient";

export type RoomChangeStartMilestone = {
  transferred_at: string | null;
  room_code: string | null;
  bed_number: string | null;
};

export type RoomChangeEvent = {
  id: number;
  label: string;
  change_type: string;
  change_source: string;
  transfer_reason: string | null;
  status: string | null;
  is_temporary: boolean;
  pending_return: boolean;
  expected_return_date: string | null;
  transferred_at: string | null;
  old_room_code: string | null;
  old_bed_number: string | null;
  new_room_code: string | null;
  new_bed_number: string | null;
};

export type RegistrationPeriodInfo = {
  name: string;
  school_year: string | null;
  semester: number | string | null;
  channel: "main" | "rolling" | null;
};

export type OccupancyRoomChangeHistory = {
  group_id: number;
  room_code: string | null;
  bed_number: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  is_current: boolean;
  registration_period: RegistrationPeriodInfo | null;
  extension_count: number;
  start: RoomChangeStartMilestone;
  changes: RoomChangeEvent[];
};

export type RoomChangeHistoryResponse = {
  occupancies: OccupancyRoomChangeHistory[];
};

export const fetchMyRoomChangeHistory = async (): Promise<OccupancyRoomChangeHistory[]> => {
  const res = await apiClient.get<RoomChangeHistoryResponse>("/student/room-change-history");
  return res.data.occupancies;
};
