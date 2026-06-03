export type BuildingStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";

export type FloorGender = "MALE" | "FEMALE";

export type FloorStatus = BuildingStatus;

export type BuildingFloor = {
  id?: number;
  floorNumber: number;
  gender: FloorGender;
  roomCount: number;
  bedCount: number;
  occupiedStudents: number;
  status: FloorStatus;
};

export type Building = {
  id: string;
  building_code: string;
  name?: string;
  address?: string;
  status: BuildingStatus;
  floors: BuildingFloor[];
};
