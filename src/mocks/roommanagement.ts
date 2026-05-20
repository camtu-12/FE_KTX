export const ROOM_CAPACITY = 14;

type BedStatus = "EMPTY" | "OCCUPIED" | "MAINTENANCE";
type BedPosition = "UPPER" | "LOWER";

type Bed = {
  id: number;
  bed_number: string;
  position: BedPosition;
  status: BedStatus;
};

export function createBeds(roomId: number, occupiedBeds: number, maintenanceBeds: number[] = []): Bed[] {
  return Array.from({ length: ROOM_CAPACITY }, (_, index) => {
    const bedIndex = index + 1;
    const isMaintenance = maintenanceBeds.includes(bedIndex);

    let status: BedStatus = "EMPTY";
    if (isMaintenance) {
      status = "MAINTENANCE";
    } else if (bedIndex <= occupiedBeds) {
      status = "OCCUPIED";
    }

    return {
      id: roomId * 100 + bedIndex,
      bed_number: String(bedIndex),
      position: bedIndex % 2 === 1 ? "UPPER" : "LOWER",
      status,
    };
  });
}

export const initialRooms = [
  {
    id: 1,
    building_code: "A",
    room_number: "101",
    gender: "MALE",
    capacity: ROOM_CAPACITY,
    occupied_beds: 6,
    status: "AVAILABLE",
    beds: createBeds(1, 6),
  },
  {
    id: 2,
    building_code: "A",
    room_number: "102",
    gender: "FEMALE",
    capacity: ROOM_CAPACITY,
    occupied_beds: 14,
    status: "FULL",
    beds: createBeds(2, 14),
  },
  {
    id: 3,
    building_code: "B",
    room_number: "201",
    gender: "MALE",
    capacity: ROOM_CAPACITY,
    occupied_beds: 8,
    status: "AVAILABLE",
    beds: createBeds(3, 8, [14]),
  },
  {
    id: 4,
    building_code: "B",
    room_number: "202",
    gender: "FEMALE",
    capacity: ROOM_CAPACITY,
    occupied_beds: 0,
    status: "MAINTENANCE",
    beds: createBeds(4, 0, [5, 12]),
  },
  {
    id: 5,
    building_code: "C",
    room_number: "301",
    gender: "FEMALE",
    capacity: ROOM_CAPACITY,
    occupied_beds: 4,
    status: "AVAILABLE",
    beds: createBeds(5, 4),
  },
  {
    id: 6,
    building_code: "C",
    room_number: "302",
    gender: "FEMALE",
    capacity: ROOM_CAPACITY,
    occupied_beds: 14,
    status: "FULL",
    beds: createBeds(6, 14),
  },
];

export default { ROOM_CAPACITY, createBeds, initialRooms };
