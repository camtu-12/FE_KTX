import {
  registrationRequests,
  type RegistrationDocumentField,
  type RegistrationFormData,
  type RegistrationRequest,
  type RegistrationStatus,
} from "../modules/admin/data/registrationRequests";

const STORAGE_KEY = "mock_registration_requests_v5";
const ROOMS_STORAGE_KEY = "mock_dorm_rooms_v4";
const BEDS_STORAGE_KEY = "mock_dorm_beds_v1";
const ONE_TIME_CLEANUP_KEY = "mock_registration_cleanup_v4";
const REQUEST_DELAY_MS = 500;

export type DormRoom = {
  id: number;
  building_code: string;
  room_number: number;
  totalBeds: number;
  availableBeds: number;
  gender: "male" | "female";
};

export type DormBed = {
  id: number;
  room_id: number;
  bed_number: number;
  position: "upper" | "lower";
  status: "occupied" | "empty" | "maintenance";
};

export type DormBedPair = {
  pairNumber: number;
  upper: DormBed;
  lower: DormBed;
};

type SubmitRegistrationPayload = {
  email: string;
  formData: RegistrationFormData;
  documents: Record<RegistrationDocumentField, string>;
};

type UpdateRegistrationStatusPayload = {
  id: number;
  status: RegistrationStatus;
  rejectionReason?: string;
};

type AssignRoomPayload = {
  requestId: number;
  roomId: number;
};

type SelectBedPayload = {
  email: string;
  bedId: number;
};

const roomSeedData: DormRoom[] = [
  // Tòa A - Tầng 1 (Nam)
  { id: 1, building_code: "A", room_number: 101, totalBeds: 14, availableBeds: 8, gender: "male" },
  { id: 2, building_code: "A", room_number: 102, totalBeds: 14, availableBeds: 5, gender: "male" },
  { id: 3, building_code: "A", room_number: 103, totalBeds: 14, availableBeds: 10, gender: "male" },
  { id: 4, building_code: "A", room_number: 104, totalBeds: 14, availableBeds: 6, gender: "male" },
  { id: 5, building_code: "A", room_number: 105, totalBeds: 14, availableBeds: 10, gender: "male" },

  // Tòa A - Tầng 2 (Nữ)
  { id: 6, building_code: "A", room_number: 201, totalBeds: 14, availableBeds: 7, gender: "female" },
  { id: 7, building_code: "A", room_number: 202, totalBeds: 14, availableBeds: 3, gender: "female" },
  { id: 8, building_code: "A", room_number: 203, totalBeds: 14, availableBeds: 4, gender: "female" },
  { id: 9, building_code: "A", room_number: 204, totalBeds: 14, availableBeds: 11, gender: "female" },
  { id: 10, building_code: "A", room_number: 205, totalBeds: 14, availableBeds: 9, gender: "female" },

  // Tòa B - Tầng 1 (Nam)
  { id: 11, building_code: "B", room_number: 101, totalBeds: 14, availableBeds: 6, gender: "male" },
  { id: 12, building_code: "B", room_number: 102, totalBeds: 14, availableBeds: 12, gender: "male" },
  { id: 13, building_code: "B", room_number: 103, totalBeds: 14, availableBeds: 4, gender: "male" },
  { id: 14, building_code: "B", room_number: 104, totalBeds: 14, availableBeds: 8, gender: "male" },
  { id: 15, building_code: "B", room_number: 105, totalBeds: 14, availableBeds: 13, gender: "male" },

  // Tòa B - Tầng 2 (Nữ)
  { id: 16, building_code: "B", room_number: 201, totalBeds: 14, availableBeds: 6, gender: "female" },
  { id: 17, building_code: "B", room_number: 202, totalBeds: 14, availableBeds: 6, gender: "female" },
  { id: 18, building_code: "B", room_number: 203, totalBeds: 14, availableBeds: 1, gender: "female" },
  { id: 19, building_code: "B", room_number: 204, totalBeds: 14, availableBeds: 5, gender: "female" },
  { id: 20, building_code: "B", room_number: 205, totalBeds: 14, availableBeds: 14, gender: "female" },
];

const getSeedBedStatus = (room: DormRoom, index: number): DormBed["status"] => {
  if (room.id !== 3) {
    return "empty";
  }

  const statusPattern: DormBed["status"][] = [
    "empty",
    "occupied",
    "maintenance",
    "empty",
    "occupied",
    "maintenance",
    "empty",
    "empty",
    "empty",
    "empty",
    "empty",
    "empty",
    "empty",
    "empty",
  ];

  return statusPattern[index] ?? "empty";
};

const buildInitialBeds = (rooms: DormRoom[]): DormBed[] =>
  rooms.flatMap((room) =>
    Array.from({ length: room.totalBeds }, (_, index) => ({
      id: room.id * 100 + index + 1,
      room_id: room.id,
      bed_number: index + 1,
      position: index % 2 === 0 ? ("upper" as const) : ("lower" as const),
      status: getSeedBedStatus(room, index),
    })),
  );

const buildBedPairs = (beds: DormBed[]): DormBedPair[] => {
  const orderedBeds = [...beds].sort((a, b) => a.bed_number - b.bed_number);
  const pairs: DormBedPair[] = [];

  for (let index = 0; index < orderedBeds.length; index += 2) {
    const upper = orderedBeds[index];
    const lower = orderedBeds[index + 1];

    if (!upper || !lower) {
      continue;
    }

    pairs.push({
      pairNumber: Math.floor(index / 2) + 1,
      upper: { ...upper, position: "upper" },
      lower: { ...lower, position: "lower" },
    });
  }

  return pairs;
};

const createCompactPreviewSvg = (title: string, subtitle: string, accent: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">
      <rect width="320" height="240" rx="18" fill="#f5f9ff"/>
      <rect x="16" y="16" width="288" height="208" rx="14" fill="#ffffff" stroke="#d7e2f2" stroke-width="2"/>
      <rect x="28" y="28" width="264" height="60" rx="12" fill="${accent}" opacity="0.14"/>
      <text x="160" y="63" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1f3152">${title}</text>
      <text x="160" y="96" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#5c7094">${subtitle}</text>
      <text x="160" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="#244cb8">Mock preview</text>
    </svg>`,
  )}`;

const buildLightweightDocuments = (
  formData: RegistrationFormData,
): Record<RegistrationDocumentField, string> => ({
  portraitPhoto: createCompactPreviewSvg("Ảnh thẻ", formData.fullName || "Sinh viên", "#244cb8"),
  cccdFrontPhoto: createCompactPreviewSvg("CCCD mặt trước", formData.mssv || "", "#2f63da"),
  cccdBackPhoto: createCompactPreviewSvg("CCCD mặt sau", formData.mssv || "", "#31b7d4"),
});

const toMockStorageRequests = (requests: RegistrationRequest[]) =>
  requests.map((request) => ({
    ...request,
    documents: buildLightweightDocuments(request.formData),
  }));

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isValidRoom = (room: unknown): room is DormRoom => {
  if (!room || typeof room !== "object") {
    return false;
  }

  const candidate = room as Partial<DormRoom>;

  return (
    typeof candidate.id === "number" &&
    typeof candidate.building_code === "string" &&
    typeof candidate.room_number === "number" &&
    typeof candidate.totalBeds === "number" &&
    typeof candidate.availableBeds === "number" &&
    (candidate.gender === "male" || candidate.gender === "female")
  );
};

const isValidBed = (bed: unknown): bed is DormBed => {
  if (!bed || typeof bed !== "object") {
    return false;
  }

  const candidate = bed as Partial<DormBed>;

  return (
    typeof candidate.id === "number" &&
    typeof candidate.room_id === "number" &&
    typeof candidate.bed_number === "number" &&
    (candidate.position === "upper" || candidate.position === "lower") &&
    (candidate.status === "occupied" || candidate.status === "empty" || candidate.status === "maintenance")
  );
};

const toIsoMinuteString = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  const hours = `${value.getHours()}`.padStart(2, "0");
  const minutes = `${value.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const cloneSeedRequests = () =>
  registrationRequests.map((request) => ({
    ...request,
    email: request.email.trim().toLowerCase(),
    formData: { ...request.formData },
    documents: { ...request.documents },
  }));

const mergeSeedRequests = (requests: RegistrationRequest[]) => {
  const seedRequests = cloneSeedRequests();
  const byId = new Map<number, RegistrationRequest>(requests.map((request) => [request.id, request]));

  for (const seedRequest of seedRequests) {
    const existing = byId.get(seedRequest.id);

    if (!existing) {
      byId.set(seedRequest.id, seedRequest);
      continue;
    }

    // Backfill optional seed fields for older localStorage snapshots, but never
    // overwrite user/admin actions that already exist in storage.
    byId.set(seedRequest.id, {
      ...existing,
      assigned_room_id:
        existing.assigned_room_id ?? seedRequest.assigned_room_id ?? null,
      bedId: existing.bedId ?? seedRequest.bedId ?? null,
    });
  }

  return [...byId.values()].sort((a, b) => b.id - a.id);
};

const getLatestRequestIdByEmail = (requests: RegistrationRequest[], email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const latest = requests
    .filter((request) => request.email === normalizedEmail)
    .sort((a, b) => b.id - a.id)[0];

  return latest?.id ?? null;
};

const isValidStatus = (status: unknown): status is RegistrationStatus => {
  return status === "pending" || status === "approved" || status === "rejected" || status === "completed";
};

const isValidRequest = (request: unknown): request is RegistrationRequest => {
  if (!request || typeof request !== "object") {
    return false;
  }

  const candidate = request as Partial<RegistrationRequest>;

  return (
    typeof candidate.id === "number" &&
    typeof candidate.email === "string" &&
    isValidStatus(candidate.status) &&
    typeof candidate.submittedAt === "string" &&
    typeof candidate.formData === "object" &&
    candidate.formData !== null &&
    typeof candidate.documents === "object" &&
    candidate.documents !== null
  );
};

const initializeStorageIfNeeded = () => {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloneSeedRequests()));
    return;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || !parsed.every(isValidRequest)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cloneSeedRequests()));
    }
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloneSeedRequests()));
  }
};

const initializeRoomsIfNeeded = () => {
  const raw = localStorage.getItem(ROOMS_STORAGE_KEY);

  if (!raw) {
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(roomSeedData));
    return;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed) || !parsed.every(isValidRoom)) {
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(roomSeedData));
    }
  } catch {
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(roomSeedData));
  }
};

const initializeBedsIfNeeded = () => {
  const raw = localStorage.getItem(BEDS_STORAGE_KEY);

  if (!raw) {
    localStorage.setItem(BEDS_STORAGE_KEY, JSON.stringify(buildInitialBeds(roomSeedData)));
    return;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed) || !parsed.every(isValidBed)) {
      localStorage.setItem(BEDS_STORAGE_KEY, JSON.stringify(buildInitialBeds(readRooms())));
    }
  } catch {
    localStorage.setItem(BEDS_STORAGE_KEY, JSON.stringify(buildInitialBeds(readRooms())));
  }
};

const readRequests = (): RegistrationRequest[] => {
  initializeStorageIfNeeded();
  const isCleanupDone = localStorage.getItem(ONE_TIME_CLEANUP_KEY) === "1";

  if (!isCleanupDone) {
    const rawBeforeCleanup = localStorage.getItem(STORAGE_KEY);

    if (rawBeforeCleanup) {
      try {
        const parsedBeforeCleanup = JSON.parse(rawBeforeCleanup) as unknown;

        if (Array.isArray(parsedBeforeCleanup)) {
          const cleaned = parsedBeforeCleanup
            .filter(isValidRequest)
            .filter((request) => {
              const normalizedEmail = request.email.trim().toLowerCase();
              const normalizedName = request.formData.fullName.trim().toLowerCase();

              return !(
                normalizedEmail === "student@gmail.com" &&
                normalizedName === "nguyễn thanh phát"
              );
            });

          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        }
      } catch {
        // Keep existing data if cleanup parsing fails.
      }
    }

    localStorage.setItem(ONE_TIME_CLEANUP_KEY, "1");
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return cloneSeedRequests();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return cloneSeedRequests();
    }

    const normalizedRequests = parsed
      .filter(isValidRequest)
      .map((request) => {
        const legacyRequest = request as RegistrationRequest & { roomId?: number | null };

        return {
          ...request,
          email: request.email.trim().toLowerCase(),
          assigned_room_id: request.assigned_room_id ?? legacyRequest.roomId ?? null,
          bedId: request.bedId ?? null,
          formData: { ...request.formData },
          documents: { ...request.documents },
        };
      });
    const mergedRequests = mergeSeedRequests(normalizedRequests);

    if (mergedRequests.length !== normalizedRequests.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toMockStorageRequests(mergedRequests)));
    }

    return mergedRequests;
  } catch {
    return cloneSeedRequests();
  }
};

const readRooms = (): DormRoom[] => {
  initializeRoomsIfNeeded();

  const raw = localStorage.getItem(ROOMS_STORAGE_KEY);
  if (!raw) {
    return roomSeedData;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return roomSeedData;
    }

    const rooms = parsed.filter(isValidRoom).map((room) => ({ ...room }));
    return rooms.length > 0 ? rooms : roomSeedData;
  } catch {
    return roomSeedData;
  }
};

const readBeds = (): DormBed[] => {
  initializeBedsIfNeeded();

  const raw = localStorage.getItem(BEDS_STORAGE_KEY);
  if (!raw) {
    return buildInitialBeds(readRooms());
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return buildInitialBeds(readRooms());
    }

    const beds = parsed.filter(isValidBed).map((bed) => ({ ...bed }));
    return beds.length > 0 ? beds : buildInitialBeds(readRooms());
  } catch {
    return buildInitialBeds(readRooms());
  }
};

const writeRooms = (rooms: DormRoom[]) => {
  try {
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
  } catch {
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms.slice(0, 60)));
  }
};

const writeBeds = (beds: DormBed[]) => {
  try {
    localStorage.setItem(BEDS_STORAGE_KEY, JSON.stringify(beds));
  } catch {
    localStorage.setItem(BEDS_STORAGE_KEY, JSON.stringify(beds.slice(0, 120)));
  }
};

const writeRequests = (requests: RegistrationRequest[]) => {
  const mockStorageRequests = toMockStorageRequests(requests);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockStorageRequests));
  } catch {
    // Keep newest records if storage is still full.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockStorageRequests.slice(0, 60)));
  }
};

export const getRegistrationRequests = async (): Promise<RegistrationRequest[]> => {
  await delay(REQUEST_DELAY_MS);
  return readRequests();
};

export const getRegistrationRequestsInstant = (): RegistrationRequest[] => {
  return readRequests();
};

export const getLatestRegistrationByEmail = async (
  email: string,
): Promise<RegistrationRequest | null> => {
  await delay(REQUEST_DELAY_MS);

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  return readRequests().find((request) => request.email.toLowerCase() === normalizedEmail) ?? null;
};

export const getLatestRegistrationByEmailInstant = (
  email: string,
): RegistrationRequest | null => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  return readRequests().find((request) => request.email.toLowerCase() === normalizedEmail) ?? null;
};

export const getDormRoomsInstant = (): DormRoom[] => {
  return readRooms();
};

export const getDormBedsForRoomInstant = (roomId: number): DormBed[] => {
  return readBeds()
    .filter((bed) => bed.room_id === roomId)
    .sort((a, b) => a.bed_number - b.bed_number);
};

export const getDormBedPairsForRoomInstant = (roomId: number): DormBedPair[] => {
  return buildBedPairs(getDormBedsForRoomInstant(roomId));
};

export const getRegistrationRequestByIdInstant = (id: number): RegistrationRequest | null => {
  return readRequests().find((request) => request.id === id) ?? null;
};

export const assignRoomToRegistration = async (
  payload: AssignRoomPayload,
): Promise<RegistrationRequest> => {
  await delay(REQUEST_DELAY_MS);

  const requests = readRequests();
  const rooms = readRooms();
  const requestIndex = requests.findIndex((request) => request.id === payload.requestId);
  const roomIndex = rooms.findIndex((room) => room.id === payload.roomId);

  if (requestIndex < 0) {
    throw new Error("Không tìm thấy đơn đăng ký.");
  }

  if (roomIndex < 0) {
    throw new Error("Không tìm thấy phòng.");
  }

  const request = requests[requestIndex];
  const room = rooms[roomIndex];

  if (request.status !== "approved") {
    throw new Error("Chỉ có thể phân phòng cho đơn đã duyệt.");
  }

  if (room.availableBeds <= 0) {
    throw new Error("Phòng đã hết chỗ.");
  }

  const updatedRequest: RegistrationRequest = {
    ...request,
    assigned_room_id: room.id,
    bedId: null,
  };

  const updatedRoom: DormRoom = {
    ...room,
    availableBeds: room.availableBeds - 1,
  };

  const nextRequests = [...requests];
  nextRequests[requestIndex] = updatedRequest;

  const nextRooms = [...rooms];
  nextRooms[roomIndex] = updatedRoom;

  writeRequests(nextRequests);
  writeRooms(nextRooms);

  return updatedRequest;
};

export const selectBedForRegistration = async (
  payload: SelectBedPayload,
): Promise<RegistrationRequest> => {
  await delay(REQUEST_DELAY_MS);

  const requests = readRequests();
  const beds = readBeds();
  const normalizedEmail = payload.email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Không tìm thấy sinh viên.");
  }

  const requestIndex = requests
    .map((request, index) => ({ request, index }))
    .filter(({ request }) => request.email.trim().toLowerCase() === normalizedEmail)
    .sort((a, b) => b.request.id - a.request.id)[0]?.index ?? -1;

  if (requestIndex < 0) {
    throw new Error("Không tìm thấy đơn đăng ký.");
  }

  const request = requests[requestIndex];
  if (request.bedId) {
    if (request.status === "completed") {
      return request;
    }

    const completedRequest: RegistrationRequest = {
      ...request,
      status: "completed",
    };

    const nextRequests = [...requests];
    nextRequests[requestIndex] = completedRequest;
    writeRequests(nextRequests);

    return completedRequest;
  }

  if (request.status !== "approved") {
    throw new Error("Chỉ chọn giường cho đơn đã duyệt.");
  }

  if (!request.assigned_room_id) {
    throw new Error("Bạn chưa được phân phòng.");
  }
  const bedIndex = beds.findIndex((bed) => bed.id === payload.bedId);

  if (bedIndex < 0) {
    throw new Error("Không tìm thấy giường.");
  }

  const selectedBed = beds[bedIndex];

  if (selectedBed.room_id !== request.assigned_room_id) {
    throw new Error("Giường này không thuộc phòng đã được phân.");
  }

  if (selectedBed.status === "occupied") {
    throw new Error("Giường đã có người chọn.");
  }

  const updatedRequest: RegistrationRequest = {
    ...request,
    bedId: selectedBed.id,
    status: "completed",
  };

  const nextRequests = [...requests];
  nextRequests[requestIndex] = updatedRequest;

  const nextBeds = [...beds];
  nextBeds[bedIndex] = { ...selectedBed, status: "occupied" };

  writeRequests(nextRequests);
  writeBeds(nextBeds);

  return updatedRequest;
};

export const submitRegistration = async (
  payload: SubmitRegistrationPayload,
): Promise<RegistrationRequest> => {
  await delay(REQUEST_DELAY_MS);

  const requests = readRequests();
  const normalizedEmail = payload.email.trim().toLowerCase();
  const latestId = getLatestRequestIdByEmail(requests, normalizedEmail);
  const latestRequest = requests.find((request) => request.id === latestId) ?? null;

  if (latestRequest?.status === "pending") {
    throw new Error("Bạn đã có đơn đang chờ duyệt.");
  }

  const requestData = {
    email: normalizedEmail,
    status: "pending" as const,
    rejectionReason: undefined,
    submittedAt: toIsoMinuteString(new Date()),
    formData: {
      ...payload.formData,
      mssv: payload.formData.mssv.trim().toUpperCase(),
      fullName: payload.formData.fullName.trim(),
      gender: payload.formData.gender.trim(),
      class: payload.formData.class.trim(),
      department: payload.formData.department.trim(),
      phone: payload.formData.phone.trim(),
      cccd: payload.formData.cccd.trim(),
      address: payload.formData.address.trim(),
      relationName: payload.formData.relationName.trim(),
      relationPhone: payload.formData.relationPhone.trim(),
      relationship: payload.formData.relationship.trim(),
    },
    // Mock mode: store lightweight previews only. Real file URLs should come from backend later.
    documents: buildLightweightDocuments(payload.formData),
  };

  const nextId = requests.reduce((maxId, request) => Math.max(maxId, request.id), 0) + 1;

  const nextRequest: RegistrationRequest = {
    id: nextId,
    ...requestData,
  };

  writeRequests([nextRequest, ...requests]);
  return nextRequest;
};

export const updateRegistrationStatus = async (
  payload: UpdateRegistrationStatusPayload,
): Promise<RegistrationRequest> => {
  await delay(REQUEST_DELAY_MS);

  const requests = readRequests();
  const targetIndex = requests.findIndex((request) => request.id === payload.id);

  if (targetIndex < 0) {
    throw new Error("Không tìm thấy đơn đăng ký.");
  }

  const target = requests[targetIndex];
  const latestId = getLatestRequestIdByEmail(requests, target.email);

  if (target.status !== "pending") {
    throw new Error("Chỉ có thể xử lý đơn đang chờ duyệt.");
  }

  if (latestId !== target.id) {
    throw new Error("Chỉ có thể xử lý hồ sơ mới nhất của sinh viên.");
  }

  const updated: RegistrationRequest = {
    ...target,
    status: payload.status,
    rejectionReason: payload.status === "rejected" ? payload.rejectionReason?.trim() : undefined,
  };

  const nextRequests = [...requests];
  nextRequests[targetIndex] = updated;
  writeRequests(nextRequests);

  return updated;
};

export const resetRegistrationMockData = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ROOMS_STORAGE_KEY);
};
