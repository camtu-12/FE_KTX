import { calculateRoomStatistics, initialRooms } from "./roommanagement";
import type { DormBed, DormBedPair, DormRoom } from "../types/dormRoom.ts";

type StoredBed = {
  id: number;
  bed_number: string;
  position: "UPPER" | "LOWER";
  // Technical status from backend: ACTIVE | MAINTENANCE
  status: "ACTIVE" | "MAINTENANCE";
};

type StoredRoomBase = Omit<(typeof initialRooms)[number], "beds">;

type StoredRoom = StoredRoomBase & {
  beds?: StoredBed[];
  gender?: string | null;
  floor?: { id: number; building_code?: string; floor_number: number; gender?: string };
};

function loadStoredRooms(): StoredRoom[] {
  return initialRooms;
}

const toDormRoom = (room: StoredRoom): DormRoom => {
  const beds: DormBed[] = Array.isArray(room.beds)
    ? room.beds.map((bed) => {
        // Determine technical status (ACTIVE | MAINTENANCE) and normalize to lowercase for DormBed
        const technicalStatus = String(bed.status).toUpperCase() === "MAINTENANCE" ? "maintenance" : "active";

        return {
          id: Number(bed.id),
          room_id: Number(room.id),
          bed_number: Number(bed.bed_number),
          position: bed.position === "UPPER" ? "upper" : "lower",
          status: technicalStatus,
        };
      })
    : [];

  const stats = calculateRoomStatistics(
    {
      id: Number(room.id),
      capacity: Number(room.capacity ?? beds.length ?? 0),
      beds: Array.isArray(room.beds)
        ? room.beds.map((bed) => ({
            id: Number(bed.id),
            status: String(bed.status).toUpperCase() === "MAINTENANCE" ? "MAINTENANCE" : "ACTIVE",
          }))
        : [],
    },
  );

  return {
    id: Number(room.id),
    building_code: String(room.building_code),
    room_number: String(room.room_number),
    totalBeds: stats.capacity,
    availableBeds: stats.availableBeds,
    capacity: stats.capacity,
    gender: room.floor?.gender ?? room.gender ?? null,
    floor_id: room.floor_id ?? room.floor?.id ?? undefined,
    floor: room.floor,
    floor_number: room.floor_number ?? room.floor?.floor_number ?? undefined,
    beds,
  };
};

export const getDormRoomsInstant = (): DormRoom[] => loadStoredRooms().map(toDormRoom);

export const getDormBedsForRoomInstant = (roomId: number): DormBed[] => {
  return getDormRoomsInstant().find((room) => room.id === roomId)?.beds ?? [];
};

export const getDormBedPairsForRoomInstant = (roomId: number): DormBedPair[] => {
  const beds = getDormBedsForRoomInstant(roomId);
  const pairs: DormBedPair[] = [];

  for (let index = 0; index < beds.length; index += 2) {
    const upper = beds[index];
    const lower = beds[index + 1];

    if (upper && lower) {
      pairs.push({ pairNumber: index / 2 + 1, upper, lower });
    }
  }

  return pairs;
};
