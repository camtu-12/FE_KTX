import { API } from "./registrationApi";

// ─── Types ───────────────────────────────────────────────────────────────────

export type OccupancyPeriodStatus = "draft" | "open" | "closed";

export type OccupancyPeriod = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  extension_until_date: string | null;
  status: OccupancyPeriodStatus;
  description: string | null;
  extensions_count?: number;
  created_at: string;
  updated_at: string;
};

export type OccupancyPeriodPayload = {
  name: string;
  start_date: string;
  end_date: string;
  extension_until_date?: string | null;
  description?: string | null;
};

// ─── API calls ───────────────────────────────────────────────────────────────

export const getOccupancyPeriods = (): Promise<OccupancyPeriod[]> =>
  API.get("/occupancy-periods").then((res) => res.data as OccupancyPeriod[]);

export const getOccupancyPeriod = (id: number): Promise<OccupancyPeriod> =>
  API.get(`/occupancy-periods/${id}`).then((res) => res.data as OccupancyPeriod);

export const createOccupancyPeriod = (payload: OccupancyPeriodPayload): Promise<OccupancyPeriod> =>
  API.post("/occupancy-periods", payload).then((res) => res.data as OccupancyPeriod);

export const updateOccupancyPeriod = (id: number, payload: Partial<OccupancyPeriodPayload>): Promise<OccupancyPeriod> =>
  API.put(`/occupancy-periods/${id}`, payload).then((res) => res.data as OccupancyPeriod);

export const openOccupancyPeriod = (id: number): Promise<OccupancyPeriod> =>
  API.put(`/occupancy-periods/${id}/open`).then((res) => res.data as OccupancyPeriod);

export const closeOccupancyPeriod = (id: number): Promise<OccupancyPeriod> =>
  API.put(`/occupancy-periods/${id}/close`).then((res) => res.data as OccupancyPeriod);

export const deleteOccupancyPeriod = (id: number): Promise<void> =>
  API.delete(`/occupancy-periods/${id}`).then(() => undefined);

export const getOpenOccupancyPeriod = (): Promise<OccupancyPeriod | null> =>
  API.get("/occupancy-periods").then((res) => {
    const list = res.data as OccupancyPeriod[];
    return list.find((p) => p.status === "open") ?? null;
  });
