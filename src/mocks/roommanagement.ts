type BedStatus = "ACTIVE" | "MAINTENANCE";
type BedPosition = "UPPER" | "LOWER";
type FloorGender = "MALE" | "FEMALE";

type Bed = {
  id: number;
  bed_number: string;
  position: BedPosition;
  status: BedStatus;
};

type Occupancy = {
  id: number;
  studentId: number;
  roomId: number;
  bedId: number;
  status: "ACTIVE" | "INACTIVE";
};

const OCCUPANCY_STORAGE_KEY = "mock_occupancies_v1";
const isBrowser = () => typeof window !== "undefined";

export function createBeds(roomId: number, capacity: number, maintenanceBeds: number[] = []): Bed[] {
  return Array.from({ length: capacity }, (_, index) => {
    const bedIndex = index + 1;
    const isMaintenance = maintenanceBeds.includes(bedIndex);

    const status: BedStatus = isMaintenance ? "MAINTENANCE" : "ACTIVE";

    return {
      id: roomId * 100 + bedIndex,
      bed_number: String(bedIndex),
      position: bedIndex % 2 === 1 ? "UPPER" : "LOWER",
      status,
    };
  });
}

export const mockOccupancies: Occupancy[] = [
  // Room 1 (A101) - 6 occupancies
  { id: 1, studentId: 1, roomId: 1, bedId: 101, status: "ACTIVE" },
  { id: 2, studentId: 2, roomId: 1, bedId: 102, status: "ACTIVE" },
  { id: 3, studentId: 3, roomId: 1, bedId: 103, status: "ACTIVE" },
  { id: 4, studentId: 4, roomId: 1, bedId: 104, status: "ACTIVE" },
  { id: 5, studentId: 5, roomId: 1, bedId: 105, status: "ACTIVE" },
  { id: 6, studentId: 6, roomId: 1, bedId: 106, status: "ACTIVE" },
  
  // Room 2 (A102) - 14 occupancies (FULL)
  { id: 7, studentId: 7, roomId: 2, bedId: 201, status: "ACTIVE" },
  { id: 8, studentId: 8, roomId: 2, bedId: 202, status: "ACTIVE" },
  { id: 9, studentId: 9, roomId: 2, bedId: 203, status: "ACTIVE" },
  { id: 10, studentId: 10, roomId: 2, bedId: 204, status: "ACTIVE" },
  { id: 11, studentId: 11, roomId: 2, bedId: 205, status: "ACTIVE" },
  { id: 12, studentId: 12, roomId: 2, bedId: 206, status: "ACTIVE" },
  { id: 13, studentId: 13, roomId: 2, bedId: 207, status: "ACTIVE" },
  { id: 14, studentId: 14, roomId: 2, bedId: 208, status: "ACTIVE" },
  { id: 15, studentId: 15, roomId: 2, bedId: 209, status: "ACTIVE" },
  { id: 16, studentId: 16, roomId: 2, bedId: 210, status: "ACTIVE" },
  { id: 17, studentId: 17, roomId: 2, bedId: 211, status: "ACTIVE" },
  { id: 18, studentId: 18, roomId: 2, bedId: 212, status: "ACTIVE" },
  { id: 19, studentId: 19, roomId: 2, bedId: 213, status: "ACTIVE" },
  { id: 20, studentId: 20, roomId: 2, bedId: 214, status: "ACTIVE" },
  
  // Room 3 (A103) - 8 occupancies
  { id: 21, studentId: 21, roomId: 3, bedId: 301, status: "ACTIVE" },
  { id: 22, studentId: 22, roomId: 3, bedId: 302, status: "ACTIVE" },
  { id: 23, studentId: 23, roomId: 3, bedId: 303, status: "ACTIVE" },
  { id: 24, studentId: 24, roomId: 3, bedId: 304, status: "ACTIVE" },
  { id: 25, studentId: 25, roomId: 3, bedId: 305, status: "ACTIVE" },
  { id: 26, studentId: 26, roomId: 3, bedId: 306, status: "ACTIVE" },
  { id: 27, studentId: 27, roomId: 3, bedId: 307, status: "ACTIVE" },
  { id: 28, studentId: 28, roomId: 3, bedId: 308, status: "ACTIVE" },
  
  // Room 5 (A105) - 4 occupancies
  { id: 29, studentId: 29, roomId: 5, bedId: 501, status: "ACTIVE" },
  { id: 30, studentId: 30, roomId: 5, bedId: 502, status: "ACTIVE" },
  { id: 31, studentId: 31, roomId: 5, bedId: 503, status: "ACTIVE" },
  { id: 32, studentId: 32, roomId: 5, bedId: 504, status: "ACTIVE" },
  
  // Room 6 (A106) - 14 occupancies (FULL)
  { id: 33, studentId: 33, roomId: 6, bedId: 601, status: "ACTIVE" },
  { id: 34, studentId: 34, roomId: 6, bedId: 602, status: "ACTIVE" },
  { id: 35, studentId: 35, roomId: 6, bedId: 603, status: "ACTIVE" },
  { id: 36, studentId: 36, roomId: 6, bedId: 604, status: "ACTIVE" },
  { id: 37, studentId: 37, roomId: 6, bedId: 605, status: "ACTIVE" },
  { id: 38, studentId: 38, roomId: 6, bedId: 606, status: "ACTIVE" },
  { id: 39, studentId: 39, roomId: 6, bedId: 607, status: "ACTIVE" },
  { id: 40, studentId: 40, roomId: 6, bedId: 608, status: "ACTIVE" },
  { id: 41, studentId: 41, roomId: 6, bedId: 609, status: "ACTIVE" },
  { id: 42, studentId: 42, roomId: 6, bedId: 610, status: "ACTIVE" },
  { id: 43, studentId: 43, roomId: 6, bedId: 611, status: "ACTIVE" },
  { id: 44, studentId: 44, roomId: 6, bedId: 612, status: "ACTIVE" },
  { id: 45, studentId: 45, roomId: 6, bedId: 613, status: "ACTIVE" },
  { id: 46, studentId: 46, roomId: 6, bedId: 614, status: "ACTIVE" },
  
  // Room 7 (A107) - 2 occupancies
  { id: 47, studentId: 47, roomId: 7, bedId: 701, status: "ACTIVE" },
  { id: 48, studentId: 48, roomId: 7, bedId: 702, status: "ACTIVE" },
  
  // Room 8 (A108) - 10 occupancies
  { id: 49, studentId: 49, roomId: 8, bedId: 802, status: "ACTIVE" },
  { id: 50, studentId: 50, roomId: 8, bedId: 803, status: "ACTIVE" },
  { id: 51, studentId: 51, roomId: 8, bedId: 804, status: "ACTIVE" },
  { id: 52, studentId: 52, roomId: 8, bedId: 805, status: "ACTIVE" },
  { id: 53, studentId: 53, roomId: 8, bedId: 806, status: "ACTIVE" },
  { id: 54, studentId: 54, roomId: 8, bedId: 807, status: "ACTIVE" },
  { id: 55, studentId: 55, roomId: 8, bedId: 808, status: "ACTIVE" },
  { id: 56, studentId: 56, roomId: 8, bedId: 809, status: "ACTIVE" },
  { id: 57, studentId: 57, roomId: 8, bedId: 810, status: "ACTIVE" },
  { id: 58, studentId: 58, roomId: 8, bedId: 811, status: "ACTIVE" },
  
  // Room 10 (A201) - 5 occupancies
  { id: 59, studentId: 59, roomId: 10, bedId: 1001, status: "ACTIVE" },
  { id: 60, studentId: 60, roomId: 10, bedId: 1002, status: "ACTIVE" },
  { id: 61, studentId: 61, roomId: 10, bedId: 1003, status: "ACTIVE" },
  { id: 62, studentId: 62, roomId: 10, bedId: 1004, status: "ACTIVE" },
  { id: 63, studentId: 63, roomId: 10, bedId: 1005, status: "ACTIVE" },
  
  // Room 11 (A202) - 14 occupancies (FULL)
  { id: 64, studentId: 64, roomId: 11, bedId: 1101, status: "ACTIVE" },
  { id: 65, studentId: 65, roomId: 11, bedId: 1102, status: "ACTIVE" },
  { id: 66, studentId: 66, roomId: 11, bedId: 1103, status: "ACTIVE" },
  { id: 67, studentId: 67, roomId: 11, bedId: 1104, status: "ACTIVE" },
  { id: 68, studentId: 68, roomId: 11, bedId: 1105, status: "ACTIVE" },
  { id: 69, studentId: 69, roomId: 11, bedId: 1106, status: "ACTIVE" },
  { id: 70, studentId: 70, roomId: 11, bedId: 1107, status: "ACTIVE" },
  { id: 71, studentId: 71, roomId: 11, bedId: 1108, status: "ACTIVE" },
  { id: 72, studentId: 72, roomId: 11, bedId: 1109, status: "ACTIVE" },
  { id: 73, studentId: 73, roomId: 11, bedId: 1110, status: "ACTIVE" },
  { id: 74, studentId: 74, roomId: 11, bedId: 1111, status: "ACTIVE" },
  { id: 75, studentId: 75, roomId: 11, bedId: 1112, status: "ACTIVE" },
  { id: 76, studentId: 76, roomId: 11, bedId: 1113, status: "ACTIVE" },
  { id: 77, studentId: 77, roomId: 11, bedId: 1114, status: "ACTIVE" },
  
  // Room 12 (A203) - 7 occupancies
  { id: 78, studentId: 78, roomId: 12, bedId: 1201, status: "ACTIVE" },
  { id: 79, studentId: 79, roomId: 12, bedId: 1202, status: "ACTIVE" },
  { id: 80, studentId: 80, roomId: 12, bedId: 1203, status: "ACTIVE" },
  { id: 81, studentId: 81, roomId: 12, bedId: 1204, status: "ACTIVE" },
  { id: 82, studentId: 82, roomId: 12, bedId: 1205, status: "ACTIVE" },
  { id: 83, studentId: 83, roomId: 12, bedId: 1206, status: "ACTIVE" },
  { id: 84, studentId: 84, roomId: 12, bedId: 1207, status: "ACTIVE" },
  
  // Room 14 (A205) - 11 occupancies
  { id: 85, studentId: 85, roomId: 14, bedId: 1401, status: "ACTIVE" },
  { id: 86, studentId: 86, roomId: 14, bedId: 1402, status: "ACTIVE" },
  { id: 87, studentId: 87, roomId: 14, bedId: 1403, status: "ACTIVE" },
  { id: 88, studentId: 88, roomId: 14, bedId: 1404, status: "ACTIVE" },
  { id: 89, studentId: 89, roomId: 14, bedId: 1405, status: "ACTIVE" },
  { id: 90, studentId: 90, roomId: 14, bedId: 1406, status: "ACTIVE" },
  { id: 91, studentId: 91, roomId: 14, bedId: 1407, status: "ACTIVE" },
  { id: 92, studentId: 92, roomId: 14, bedId: 1408, status: "ACTIVE" },
  { id: 93, studentId: 93, roomId: 14, bedId: 1409, status: "ACTIVE" },
  { id: 94, studentId: 94, roomId: 14, bedId: 1410, status: "ACTIVE" },
  { id: 95, studentId: 95, roomId: 14, bedId: 1411, status: "ACTIVE" },
  
  // Room 15 (A206) - 14 occupancies (FULL)
  { id: 96, studentId: 96, roomId: 15, bedId: 1501, status: "ACTIVE" },
  { id: 97, studentId: 97, roomId: 15, bedId: 1502, status: "ACTIVE" },
  { id: 98, studentId: 98, roomId: 15, bedId: 1503, status: "ACTIVE" },
  { id: 99, studentId: 99, roomId: 15, bedId: 1504, status: "ACTIVE" },
  { id: 100, studentId: 100, roomId: 15, bedId: 1505, status: "ACTIVE" },
  { id: 101, studentId: 101, roomId: 15, bedId: 1506, status: "ACTIVE" },
  { id: 102, studentId: 102, roomId: 15, bedId: 1507, status: "ACTIVE" },
  { id: 103, studentId: 103, roomId: 15, bedId: 1508, status: "ACTIVE" },
  { id: 104, studentId: 104, roomId: 15, bedId: 1509, status: "ACTIVE" },
  { id: 105, studentId: 105, roomId: 15, bedId: 1510, status: "ACTIVE" },
  { id: 106, studentId: 106, roomId: 15, bedId: 1511, status: "ACTIVE" },
  { id: 107, studentId: 107, roomId: 15, bedId: 1512, status: "ACTIVE" },
  { id: 108, studentId: 108, roomId: 15, bedId: 1513, status: "ACTIVE" },
  { id: 109, studentId: 109, roomId: 15, bedId: 1514, status: "ACTIVE" },
  
  // Room 16 (A207) - 1 occupancy
  { id: 110, studentId: 110, roomId: 16, bedId: 1601, status: "ACTIVE" },
  
  // Room 17 (A208) - 9 occupancies
  { id: 111, studentId: 111, roomId: 17, bedId: 1701, status: "ACTIVE" },
  { id: 112, studentId: 112, roomId: 17, bedId: 1702, status: "ACTIVE" },
  { id: 113, studentId: 113, roomId: 17, bedId: 1703, status: "ACTIVE" },
  { id: 114, studentId: 114, roomId: 17, bedId: 1704, status: "ACTIVE" },
  { id: 115, studentId: 115, roomId: 17, bedId: 1705, status: "ACTIVE" },
  { id: 116, studentId: 116, roomId: 17, bedId: 1706, status: "ACTIVE" },
  { id: 117, studentId: 117, roomId: 17, bedId: 1707, status: "ACTIVE" },
  { id: 118, studentId: 118, roomId: 17, bedId: 1708, status: "ACTIVE" },
  { id: 119, studentId: 119, roomId: 17, bedId: 1709, status: "ACTIVE" },
  
  // Room 18 (A209) - 3 occupancies
  { id: 120, studentId: 120, roomId: 18, bedId: 1801, status: "ACTIVE" },
  { id: 121, studentId: 121, roomId: 18, bedId: 1802, status: "ACTIVE" },
  { id: 122, studentId: 122, roomId: 18, bedId: 1803, status: "ACTIVE" },
  
  // Room 19 (A210) - 13 occupancies
  { id: 123, studentId: 123, roomId: 19, bedId: 1901, status: "ACTIVE" },
  { id: 124, studentId: 124, roomId: 19, bedId: 1902, status: "ACTIVE" },
  { id: 125, studentId: 125, roomId: 19, bedId: 1903, status: "ACTIVE" },
  { id: 126, studentId: 126, roomId: 19, bedId: 1904, status: "ACTIVE" },
  { id: 127, studentId: 127, roomId: 19, bedId: 1905, status: "ACTIVE" },
  { id: 128, studentId: 128, roomId: 19, bedId: 1906, status: "ACTIVE" },
  { id: 129, studentId: 129, roomId: 19, bedId: 1907, status: "ACTIVE" },
  { id: 130, studentId: 130, roomId: 19, bedId: 1908, status: "ACTIVE" },
  { id: 131, studentId: 131, roomId: 19, bedId: 1909, status: "ACTIVE" },
  { id: 132, studentId: 132, roomId: 19, bedId: 1910, status: "ACTIVE" },
  { id: 133, studentId: 133, roomId: 19, bedId: 1911, status: "ACTIVE" },
  { id: 134, studentId: 134, roomId: 19, bedId: 1912, status: "ACTIVE" },
  { id: 135, studentId: 135, roomId: 19, bedId: 1913, status: "ACTIVE" },
  
  // Room 20 (B101) - 3 occupancies
  { id: 136, studentId: 136, roomId: 20, bedId: 2001, status: "ACTIVE" },
  { id: 137, studentId: 137, roomId: 20, bedId: 2002, status: "ACTIVE" },
  { id: 138, studentId: 138, roomId: 20, bedId: 2003, status: "ACTIVE" },
  
  // Room 21 (B102) - 14 occupancies (FULL)
  { id: 139, studentId: 139, roomId: 21, bedId: 2101, status: "ACTIVE" },
  { id: 140, studentId: 140, roomId: 21, bedId: 2102, status: "ACTIVE" },
  { id: 141, studentId: 141, roomId: 21, bedId: 2103, status: "ACTIVE" },
  { id: 142, studentId: 142, roomId: 21, bedId: 2104, status: "ACTIVE" },
  { id: 143, studentId: 143, roomId: 21, bedId: 2105, status: "ACTIVE" },
  { id: 144, studentId: 144, roomId: 21, bedId: 2106, status: "ACTIVE" },
  { id: 145, studentId: 145, roomId: 21, bedId: 2107, status: "ACTIVE" },
  { id: 146, studentId: 146, roomId: 21, bedId: 2108, status: "ACTIVE" },
  { id: 147, studentId: 147, roomId: 21, bedId: 2109, status: "ACTIVE" },
  { id: 148, studentId: 148, roomId: 21, bedId: 2110, status: "ACTIVE" },
  { id: 149, studentId: 149, roomId: 21, bedId: 2111, status: "ACTIVE" },
  { id: 150, studentId: 150, roomId: 21, bedId: 2112, status: "ACTIVE" },
  { id: 151, studentId: 151, roomId: 21, bedId: 2113, status: "ACTIVE" },
  { id: 152, studentId: 152, roomId: 21, bedId: 2114, status: "ACTIVE" },
  
  // Room 22 (B103) - 7 occupancies
  { id: 153, studentId: 153, roomId: 22, bedId: 2201, status: "ACTIVE" },
  { id: 154, studentId: 154, roomId: 22, bedId: 2202, status: "ACTIVE" },
  { id: 155, studentId: 155, roomId: 22, bedId: 2203, status: "ACTIVE" },
  { id: 156, studentId: 156, roomId: 22, bedId: 2204, status: "ACTIVE" },
  { id: 157, studentId: 157, roomId: 22, bedId: 2205, status: "ACTIVE" },
  { id: 158, studentId: 158, roomId: 22, bedId: 2206, status: "ACTIVE" },
  { id: 159, studentId: 159, roomId: 22, bedId: 2207, status: "ACTIVE" },
  
  // Room 24 (B201) - 4 occupancies
  { id: 160, studentId: 160, roomId: 24, bedId: 2401, status: "ACTIVE" },
  { id: 161, studentId: 161, roomId: 24, bedId: 2402, status: "ACTIVE" },
  { id: 162, studentId: 162, roomId: 24, bedId: 2403, status: "ACTIVE" },
  { id: 163, studentId: 163, roomId: 24, bedId: 2404, status: "ACTIVE" },
  
  // Room 25 (B202) - 12 occupancies
  { id: 164, studentId: 164, roomId: 25, bedId: 2501, status: "ACTIVE" },
  { id: 165, studentId: 165, roomId: 25, bedId: 2502, status: "ACTIVE" },
  { id: 166, studentId: 166, roomId: 25, bedId: 2503, status: "ACTIVE" },
  { id: 167, studentId: 167, roomId: 25, bedId: 2504, status: "ACTIVE" },
  { id: 168, studentId: 168, roomId: 25, bedId: 2505, status: "ACTIVE" },
  { id: 169, studentId: 169, roomId: 25, bedId: 2506, status: "ACTIVE" },
  { id: 170, studentId: 170, roomId: 25, bedId: 2507, status: "ACTIVE" },
  { id: 171, studentId: 171, roomId: 25, bedId: 2508, status: "ACTIVE" },
  { id: 172, studentId: 172, roomId: 25, bedId: 2509, status: "ACTIVE" },
  { id: 173, studentId: 173, roomId: 25, bedId: 2510, status: "ACTIVE" },
  { id: 174, studentId: 174, roomId: 25, bedId: 2511, status: "ACTIVE" },
  { id: 175, studentId: 175, roomId: 25, bedId: 2512, status: "ACTIVE" },
  
  // Room 26 (B203) - 14 occupancies (FULL)
  { id: 176, studentId: 176, roomId: 26, bedId: 2601, status: "ACTIVE" },
  { id: 177, studentId: 177, roomId: 26, bedId: 2602, status: "ACTIVE" },
  { id: 178, studentId: 178, roomId: 26, bedId: 2603, status: "ACTIVE" },
  { id: 179, studentId: 179, roomId: 26, bedId: 2604, status: "ACTIVE" },
  { id: 180, studentId: 180, roomId: 26, bedId: 2605, status: "ACTIVE" },
  { id: 181, studentId: 181, roomId: 26, bedId: 2606, status: "ACTIVE" },
  { id: 182, studentId: 182, roomId: 26, bedId: 2607, status: "ACTIVE" },
  { id: 183, studentId: 183, roomId: 26, bedId: 2608, status: "ACTIVE" },
  { id: 184, studentId: 184, roomId: 26, bedId: 2609, status: "ACTIVE" },
  { id: 185, studentId: 185, roomId: 26, bedId: 2610, status: "ACTIVE" },
  { id: 186, studentId: 186, roomId: 26, bedId: 2611, status: "ACTIVE" },
  { id: 187, studentId: 187, roomId: 26, bedId: 2612, status: "ACTIVE" },
  { id: 188, studentId: 188, roomId: 26, bedId: 2613, status: "ACTIVE" },
  { id: 189, studentId: 189, roomId: 26, bedId: 2614, status: "ACTIVE" },
  
  // Room 27 (B204) - 2 occupancies
  { id: 190, studentId: 190, roomId: 27, bedId: 2701, status: "ACTIVE" },
  { id: 191, studentId: 191, roomId: 27, bedId: 2702, status: "ACTIVE" },
  
  // Room 28 (B301) - 6 occupancies
  { id: 192, studentId: 192, roomId: 28, bedId: 2801, status: "ACTIVE" },
  { id: 193, studentId: 193, roomId: 28, bedId: 2802, status: "ACTIVE" },
  { id: 194, studentId: 194, roomId: 28, bedId: 2803, status: "ACTIVE" },
  { id: 195, studentId: 195, roomId: 28, bedId: 2804, status: "ACTIVE" },
  { id: 196, studentId: 196, roomId: 28, bedId: 2805, status: "ACTIVE" },
  { id: 197, studentId: 197, roomId: 28, bedId: 2806, status: "ACTIVE" },
  
  // Room 30 (B303) - 9 occupancies
  { id: 198, studentId: 198, roomId: 30, bedId: 3001, status: "ACTIVE" },
  { id: 199, studentId: 199, roomId: 30, bedId: 3002, status: "ACTIVE" },
  { id: 200, studentId: 200, roomId: 30, bedId: 3003, status: "ACTIVE" },
  { id: 201, studentId: 201, roomId: 30, bedId: 3004, status: "ACTIVE" },
  { id: 202, studentId: 202, roomId: 30, bedId: 3005, status: "ACTIVE" },
  { id: 203, studentId: 203, roomId: 30, bedId: 3006, status: "ACTIVE" },
  { id: 204, studentId: 204, roomId: 30, bedId: 3007, status: "ACTIVE" },
  { id: 205, studentId: 205, roomId: 30, bedId: 3008, status: "ACTIVE" },
  { id: 206, studentId: 206, roomId: 30, bedId: 3009, status: "ACTIVE" },
];

const cloneOccupancies = (occupancies: Occupancy[]) => occupancies.map((occupancy) => ({ ...occupancy }));

const isOccupancyLike = (value: unknown): value is Occupancy => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<Occupancy>;
  return (
    typeof candidate.id === "number" &&
    typeof candidate.studentId === "number" &&
    typeof candidate.roomId === "number" &&
    typeof candidate.bedId === "number" &&
    (candidate.status === "ACTIVE" || candidate.status === "INACTIVE")
  );
};

const readStoredOccupancies = (): Occupancy[] => {
  if (!isBrowser()) {
    return mockOccupancies;
  }

  try {
    const raw = window.localStorage.getItem(OCCUPANCY_STORAGE_KEY);
    if (!raw) {
      return mockOccupancies;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || !parsed.every(isOccupancyLike)) {
      return mockOccupancies;
    }

    return parsed;
  } catch {
    return mockOccupancies;
  }
};

const writeStoredOccupancies = (occupancies: Occupancy[]) => {
  const nextOccupancies = cloneOccupancies(occupancies);

  mockOccupancies.splice(0, mockOccupancies.length, ...nextOccupancies);

  if (!isBrowser()) {
    return nextOccupancies;
  }

  window.localStorage.setItem(OCCUPANCY_STORAGE_KEY, JSON.stringify(nextOccupancies));
  window.dispatchEvent(new Event("ktx-rooms-updated"));

  return nextOccupancies;
};

export const getStoredOccupancies = () => cloneOccupancies(readStoredOccupancies());

export function getOccupancy() {
  return getStoredOccupancies();
}

export function hasOccupancy(bedId: number): boolean {
  return readStoredOccupancies().some(
    (occupancy) => occupancy.bedId === bedId && occupancy.status === "ACTIVE"
  );
}

export function getOccupancyCountForRoom(roomId: number): number {
  return readStoredOccupancies().filter(
    (occupancy) => occupancy.roomId === roomId && occupancy.status === "ACTIVE"
  ).length;
}

type RoomLike = {
  id: number;
  capacity?: number;
  beds?: Array<{ id: number; status: string }>;
};

type OccupancyLike = {
  id: number;
  studentId: number;
  roomId: number;
  bedId: number;
  status: "ACTIVE" | "INACTIVE";
};

const normalizeTechnicalBedStatus = (status: string) => (String(status).toUpperCase() === "MAINTENANCE" ? "MAINTENANCE" : "ACTIVE");

export function calculateRoomStatistics(room: RoomLike, occupancies: OccupancyLike[] = readStoredOccupancies()) {
  const beds = Array.isArray(room.beds) ? room.beds : [];
  const activeBeds = beds.filter((bed) => normalizeTechnicalBedStatus(bed.status) === "ACTIVE").length;
  const maintenanceBeds = beds.filter((bed) => normalizeTechnicalBedStatus(bed.status) === "MAINTENANCE").length;
  const occupiedBeds = beds.filter(
    (bed) =>
      normalizeTechnicalBedStatus(bed.status) === "ACTIVE" &&
      occupancies.some((occupancy) => occupancy.roomId === room.id && occupancy.bedId === bed.id && occupancy.status === "ACTIVE"),
  ).length;

  return {
    capacity: Number(room.capacity ?? beds.length ?? 0),
    occupiedBeds,
    availableBeds: Math.max(activeBeds - occupiedBeds, 0),
    maintenanceBeds,
  };
}

export function assignMockOccupancy(room: RoomLike, bedId?: number) {
  const beds = Array.isArray(room.beds) ? room.beds : [];
  const occupancies = readStoredOccupancies();
  const targetBed = typeof bedId === "number"
    ? beds.find((bed) => bed.id === bedId && normalizeTechnicalBedStatus(bed.status) === "ACTIVE")
    : beds.find((bed) => normalizeTechnicalBedStatus(bed.status) === "ACTIVE" && !occupancies.some((occupancy) => occupancy.bedId === bed.id && occupancy.status === "ACTIVE"));

  if (!targetBed || occupancies.some((occupancy) => occupancy.bedId === targetBed.id && occupancy.status === "ACTIVE")) {
    return null;
  }

  const nextId = occupancies.length > 0 ? Math.max(...occupancies.map((occupancy) => occupancy.id)) + 1 : 1;
  const occupancy: Occupancy = {
    id: nextId,
    studentId: nextId,
    roomId: room.id,
    bedId: targetBed.id,
    status: "ACTIVE",
  };

  writeStoredOccupancies([...occupancies, occupancy]);
  return occupancy;
}

export function validateBedStatusChange(
  bedId: number,
  newStatus: "ACTIVE" | "MAINTENANCE",
  currentStatus: "ACTIVE" | "MAINTENANCE"
): { valid: boolean; error?: string } {
  // MAINTENANCE -> ACTIVE: luôn cho phép
  if (currentStatus === "MAINTENANCE" && newStatus === "ACTIVE") {
    return { valid: true };
  }

  // ACTIVE -> MAINTENANCE: chỉ cho phép nếu không có occupancy
  if (currentStatus === "ACTIVE" && newStatus === "MAINTENANCE") {
    if (hasOccupancy(bedId)) {
      return {
        valid: false,
        error: "Không thể chuyển giường sang bảo trì vì đang có sinh viên sử dụng. Vui lòng chuyển sinh viên sang giường khác hoặc kết thúc lưu trú trước.",
      };
    }
    return { valid: true };
  }

  // Trạng thái giống nhau: không cần thay đổi
  return { valid: true };
}

type RoomSeed = {
  id: number;
  building_code: string;
  room_number: string;
  capacity: number;
  floor_id: number;
  floor_number: number;
  gender: FloorGender;
  status: "AVAILABLE" | "FULL" | "MAINTENANCE";
  maintenanceBeds?: number[];
};

const roomSeeds: RoomSeed[] = [
  { id: 1, building_code: "A", room_number: "101", capacity: 14, floor_id: 1, floor_number: 1, gender: "MALE", status: "AVAILABLE" },
  { id: 2, building_code: "A", room_number: "102", capacity: 14, floor_id: 1, floor_number: 1, gender: "MALE", status: "FULL" },
  { id: 3, building_code: "A", room_number: "103", capacity: 14, floor_id: 1, floor_number: 1, gender: "MALE", status: "AVAILABLE", maintenanceBeds: [14] },
  { id: 4, building_code: "A", room_number: "104", capacity: 14, floor_id: 1, floor_number: 1, gender: "MALE", status: "MAINTENANCE", maintenanceBeds: [5, 12] },
  { id: 5, building_code: "A", room_number: "105", capacity: 14, floor_id: 1, floor_number: 1, gender: "MALE", status: "AVAILABLE" },
  { id: 6, building_code: "A", room_number: "106", capacity: 14, floor_id: 1, floor_number: 1, gender: "MALE", status: "FULL" },
  { id: 7, building_code: "A", room_number: "107", capacity: 14, floor_id: 1, floor_number: 1, gender: "MALE", status: "AVAILABLE" },
  { id: 8, building_code: "A", room_number: "108", capacity: 14, floor_id: 1, floor_number: 1, gender: "MALE", status: "AVAILABLE", maintenanceBeds: [1] },
  { id: 9, building_code: "A", room_number: "109", capacity: 14, floor_id: 1, floor_number: 1, gender: "MALE", status: "AVAILABLE" },
  { id: 10, building_code: "A", room_number: "201", capacity: 14, floor_id: 2, floor_number: 2, gender: "FEMALE", status: "AVAILABLE" },
  { id: 11, building_code: "A", room_number: "202", capacity: 14, floor_id: 2, floor_number: 2, gender: "FEMALE", status: "FULL" },
  { id: 12, building_code: "A", room_number: "203", capacity: 14, floor_id: 2, floor_number: 2, gender: "FEMALE", status: "AVAILABLE" },
  { id: 13, building_code: "A", room_number: "204", capacity: 14, floor_id: 2, floor_number: 2, gender: "FEMALE", status: "MAINTENANCE", maintenanceBeds: [3, 9] },
  { id: 14, building_code: "A", room_number: "205", capacity: 14, floor_id: 2, floor_number: 2, gender: "FEMALE", status: "AVAILABLE" },
  { id: 15, building_code: "A", room_number: "206", capacity: 14, floor_id: 2, floor_number: 2, gender: "FEMALE", status: "FULL" },
  { id: 16, building_code: "A", room_number: "207", capacity: 14, floor_id: 2, floor_number: 2, gender: "FEMALE", status: "AVAILABLE" },
  { id: 17, building_code: "A", room_number: "208", capacity: 14, floor_id: 2, floor_number: 2, gender: "FEMALE", status: "AVAILABLE" },
  { id: 18, building_code: "A", room_number: "209", capacity: 14, floor_id: 2, floor_number: 2, gender: "FEMALE", status: "AVAILABLE" },
  { id: 19, building_code: "A", room_number: "210", capacity: 14, floor_id: 2, floor_number: 2, gender: "FEMALE", status: "AVAILABLE" },
  { id: 20, building_code: "B", room_number: "101", capacity: 14, floor_id: 3, floor_number: 1, gender: "MALE", status: "AVAILABLE" },
  { id: 21, building_code: "B", room_number: "102", capacity: 14, floor_id: 3, floor_number: 1, gender: "MALE", status: "FULL" },
  { id: 22, building_code: "B", room_number: "103", capacity: 14, floor_id: 3, floor_number: 1, gender: "MALE", status: "AVAILABLE", maintenanceBeds: [2] },
  { id: 23, building_code: "B", room_number: "104", capacity: 14, floor_id: 3, floor_number: 1, gender: "MALE", status: "MAINTENANCE", maintenanceBeds: [6, 11] },
  { id: 24, building_code: "B", room_number: "201", capacity: 14, floor_id: 4, floor_number: 2, gender: "FEMALE", status: "AVAILABLE" },
  { id: 25, building_code: "B", room_number: "202", capacity: 14, floor_id: 4, floor_number: 2, gender: "FEMALE", status: "AVAILABLE" },
  { id: 26, building_code: "B", room_number: "203", capacity: 14, floor_id: 4, floor_number: 2, gender: "FEMALE", status: "FULL" },
  { id: 27, building_code: "B", room_number: "204", capacity: 14, floor_id: 4, floor_number: 2, gender: "FEMALE", status: "AVAILABLE", maintenanceBeds: [8] },
  { id: 28, building_code: "B", room_number: "301", capacity: 14, floor_id: 5, floor_number: 3, gender: "FEMALE", status: "AVAILABLE" },
  { id: 29, building_code: "B", room_number: "302", capacity: 14, floor_id: 5, floor_number: 3, gender: "FEMALE", status: "AVAILABLE" },
  { id: 30, building_code: "B", room_number: "303", capacity: 14, floor_id: 5, floor_number: 3, gender: "FEMALE", status: "AVAILABLE" },
  { id: 31, building_code: "B", room_number: "304", capacity: 14, floor_id: 5, floor_number: 3, gender: "FEMALE", status: "MAINTENANCE", maintenanceBeds: [4, 10] },
];

export const initialRooms = roomSeeds.map((roomSeed) => ({
  id: roomSeed.id,
  building_code: roomSeed.building_code,
  room_number: roomSeed.room_number,
  capacity: roomSeed.capacity,
  floor_id: roomSeed.floor_id,
  floor: {
    id: roomSeed.floor_id,
    building_code: roomSeed.building_code,
    floor_number: roomSeed.floor_number,
    gender: roomSeed.gender,
  },
  floor_number: roomSeed.floor_number,
  status: roomSeed.status,
  beds: createBeds(roomSeed.id, roomSeed.capacity, roomSeed.maintenanceBeds ?? []),
}));

export default { createBeds, initialRooms, getOccupancy, hasOccupancy, getOccupancyCountForRoom, calculateRoomStatistics, assignMockOccupancy };
