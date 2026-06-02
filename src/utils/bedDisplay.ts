import type { DormBed } from "../types/dormRoom";

export type BedDisplayStatus = "MAINTENANCE" | "HAS_OCCUPANCY" | "NO_OCCUPANCY";

export function getBedDisplayStatus(
  bed: DormBed,
  occupancies?: Array<{ bedId: number; status?: string }>,
  hasOccupancyFn?: (bedId: number) => boolean,
): BedDisplayStatus {
  // If technical bed status is maintenance, show maintenance
  if (String(bed.status).toUpperCase() === "MAINTENANCE") return "MAINTENANCE";

  // Prefer explicit hasOccupancy function when provided
  if (typeof hasOccupancyFn === "function") {
    return hasOccupancyFn(bed.id) ? "HAS_OCCUPANCY" : "NO_OCCUPANCY";
  }

  // Fallback to occupancies array
  if (Array.isArray(occupancies)) {
    const found = occupancies.some((o) => o && Number(o.bedId) === Number(bed.id) && (String(o.status || "").toUpperCase() === "ACTIVE" || !o.status));
    return found ? "HAS_OCCUPANCY" : "NO_OCCUPANCY";
  }

  // Default: no occupancy
  return "NO_OCCUPANCY";
}

export default getBedDisplayStatus;
