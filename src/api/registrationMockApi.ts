import {
  registrationRequests,
  type RegistrationDocumentField,
  type RegistrationFormData,
  type RegistrationRequest,
  type RegistrationStatus,
} from "../modules/admin/data/registrationRequests";

const STORAGE_KEY = "mock_registration_requests_v1";
const ONE_TIME_CLEANUP_KEY = "mock_registration_cleanup_thanh_phat_v1";
const REQUEST_DELAY_MS = 500;

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

const getLatestRequestIdByEmail = (requests: RegistrationRequest[], email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const latest = requests
    .filter((request) => request.email === normalizedEmail)
    .sort((a, b) => b.id - a.id)[0];

  return latest?.id ?? null;
};

const isValidStatus = (status: unknown): status is RegistrationStatus => {
  return status === "pending" || status === "approved" || status === "rejected";
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

    return parsed
      .filter(isValidRequest)
      .map((request) => ({
        ...request,
        email: request.email.trim().toLowerCase(),
        formData: { ...request.formData },
        documents: { ...request.documents },
      }))
      .sort((a, b) => b.id - a.id);
  } catch {
    return cloneSeedRequests();
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
};
