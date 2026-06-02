export type DormRoom = {
  id: number;
  building_code: string;
  room_number: number | string;
  totalBeds: number;
  availableBeds: number;
  capacity?: number;
  gender?: string | null;
  floor_id?: number;
  floor?: { id: number; building_code?: string; floor_number: number; gender?: string };
  floor_number?: number;
  beds?: DormBed[];
};

export type DormBed = {
  id: number;
  room_id: number;
  bed_number: number;
  position: "upper" | "lower";
  // Technical bed status coming from backend: active | maintenance
  status: "active" | "maintenance";
};

export type DormBedPair = {
  pairNumber: number;
  upper: DormBed;
  lower: DormBed;
};
