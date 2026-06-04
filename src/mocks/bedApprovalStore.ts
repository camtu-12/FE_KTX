export type BedApprovalStatus = "pending" | "approved" | "rejected";

export type BedApprovalRecord = {
  registrationId: number;
  bedId: number;
  status: BedApprovalStatus;
  updatedAt: string;
};

const STORAGE_KEY = "ktx-bed-approval-records";
const UPDATED_EVENT = "ktx-bed-approvals-updated";

const isBrowser = () => typeof window !== "undefined";

const readRecords = (): BedApprovalRecord[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRecords = (records: BedApprovalRecord[]) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(UPDATED_EVENT));
  window.dispatchEvent(new Event("ktx-registrations-updated"));
};

export const getBedApprovalStatus = (registrationId?: number | null, bedId?: number | null): BedApprovalStatus | null => {
  if (!registrationId || !bedId) {
    return null;
  }

  return readRecords().find((record) => record.registrationId === registrationId && record.bedId === bedId)?.status ?? null;
};

export const getEffectiveBedApprovalStatus = (
  registrationId?: number | null,
  bedId?: number | null,
): BedApprovalStatus | null => {
  if (!registrationId || !bedId) {
    return null;
  }

  return getBedApprovalStatus(registrationId, bedId) ?? "pending";
};

export const isBedRejectedByApproval = (bedId?: number | null): boolean => {
  if (!bedId) {
    return false;
  }

  const latestRecord = readRecords()
    .filter((record) => record.bedId === bedId)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];

  return latestRecord?.status === "rejected";
};

export const setBedApprovalStatus = (registrationId: number, bedId: number, status: BedApprovalStatus) => {
  const records = readRecords();
  const nextRecord: BedApprovalRecord = {
    registrationId,
    bedId,
    status,
    updatedAt: new Date().toISOString(),
  };
  const index = records.findIndex((record) => record.registrationId === registrationId && record.bedId === bedId);

  if (index >= 0) {
    records[index] = nextRecord;
  } else {
    records.push(nextRecord);
  }

  writeRecords(records);
};

export const markBedSelectionPending = (registrationId: number, bedId: number) => {
  setBedApprovalStatus(registrationId, bedId, "pending");
};

export const BED_APPROVAL_UPDATED_EVENT = UPDATED_EVENT;
