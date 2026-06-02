export type BuildingStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";

export type FloorGender = "MALE" | "FEMALE";

export type FloorStatus = BuildingStatus;

export type BuildingFloor = {
  floorNumber: number;
  gender: FloorGender;
  roomCount: number;
  bedCount: number;
  occupiedStudents: number;
  status: FloorStatus;
};

export type Building = {
  id: number;
  building_code: string;
  address?: string;
  status: BuildingStatus;
  floors: BuildingFloor[];
};

export const initialBuildings: Building[] = [
  {
    id: 1,
    building_code: "A",
    address: "180 Cao Lỗ, Phường 4, Quận 8, TP.HCM",
    status: "ACTIVE",
    floors: [
      {
        floorNumber: 1,
        gender: "MALE",
        roomCount: 9,
        bedCount: 14,
        occupiedStudents: 112,
        status: "ACTIVE",
      },
      {
        floorNumber: 2,
        gender: "FEMALE",
        roomCount: 10,
        bedCount: 14,
        occupiedStudents: 116,
        status: "ACTIVE",
      },
    ],
  },
  {
    id: 2,
    building_code: "B",
    address: "180 Cao Lỗ, Phường 4, Quận 8, TP.HCM",
    status: "ACTIVE",
    floors: [
      {
        floorNumber: 1,
        gender: "MALE",
        roomCount: 8,
        bedCount: 14,
        occupiedStudents: 84,
        status: "ACTIVE",
      },
      {
        floorNumber: 2,
        gender: "MALE",
        roomCount: 8,
        bedCount: 14,
        occupiedStudents: 90,
        status: "ACTIVE",
      },
      {
        floorNumber: 3,
        gender: "MALE",
        roomCount: 9,
        bedCount: 14,
        occupiedStudents: 96,
        status: "ACTIVE",
      },
      {
        floorNumber: 4,
        gender: "MALE",
        roomCount: 9,
        bedCount: 14,
        occupiedStudents: 88,
        status: "ACTIVE",
      },
      {
        floorNumber: 5,
        gender: "MALE",
        roomCount: 8,
        bedCount: 14,
        occupiedStudents: 80,
        status: "MAINTENANCE",
      },
    ],
  },
  {
    id: 3,
    building_code: "C",
    address: "KTX STU - 131 Đường",
    status: "MAINTENANCE",
    floors: [
      {
        floorNumber: 1,
        gender: "FEMALE",
        roomCount: 6,
        bedCount: 14,
        occupiedStudents: 58,
        status: "ACTIVE",
      },
      {
        floorNumber: 2,
        gender: "FEMALE",
        roomCount: 6,
        bedCount: 14,
        occupiedStudents: 0,
        status: "MAINTENANCE",
      },
      {
        floorNumber: 3,
        gender: "FEMALE",
        roomCount: 6,
        bedCount: 14,
        occupiedStudents: 46,
        status: "ACTIVE",
      },
      {
        floorNumber: 4,
        gender: "FEMALE",
        roomCount: 6,
        bedCount: 14,
        occupiedStudents: 44,
        status: "ACTIVE",
      },
    ],
  },
];
