export type DormCapacitySummary = {
  total_beds: number;
  maintenance_or_blocked_beds: number;
  physically_occupied_or_reserved_beds: number;
  available_physical_beds: number;
  approved_extensions: number;
  approved_unassigned_registrations: number;
  approved_dorm_reservations: number;
  reserved_buffer_beds: number;
  available_approval_slots: number;
  proposed_approved_count: number;
  remaining_after_proposals: number;
  capacity_exceeded: boolean;
  over_capacity_count: number;
};
