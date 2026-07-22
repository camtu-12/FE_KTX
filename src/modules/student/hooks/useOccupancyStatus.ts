import { useCallback, useEffect, useState } from "react";
import { getMyRegistration, getMyRegistrationHistory } from "../../../api/registrationService";
import type { RegistrationRequest } from "../../admin/data/registrationRequests";
import { useAuthStore } from "../../auth/store";

// Trạng thái lifecycle thật của occupancy (registration.occupancy_status), theo đúng thứ tự:
// PROPOSED -> ROOM_CONFIRMED -> PENDING_PAYMENT -> ACTIVE -> {checked_out|forced_checkout|CANCELLED}
// (checked_out/forced_checkout/checkout_requested là các biến thể hiển thị của COMPLETED/TERMINATED/ACTIVE
// do RegistrationController::mapOccupancyStatus() trả về — xem BE_KTX RegistrationController.php:1469-1484).
const ACTIVE_OR_LATER_STATUSES = new Set(["ACTIVE", "checkout_requested", "checked_out", "forced_checkout"]);
const BILLABLE_OR_LATER_STATUSES = new Set([
  "PENDING_PAYMENT",
  "ACTIVE",
  "checkout_requested",
  "checked_out",
  "forced_checkout",
]);

export type UseOccupancyStatusResult = {
  isLoading: boolean;
  /** occupancy_status của đăng ký MỚI NHẤT — dùng để biết trạng thái HIỆN TẠI. */
  currentOccupancyStatus: string | null;
  /** true nếu occupancy hiện tại đang thật sự ACTIVE (không tính checkout_requested/checked_out...). */
  isCurrentlyActive: boolean;
  /** true nếu sinh viên đã TỪNG có occupancy đạt ACTIVE (hiện tại hoặc quá khứ). */
  hasEverBeenActive: boolean;
  /** true nếu sinh viên đã TỪNG có occupancy đạt PENDING_PAYMENT trở lên (tức đã từng có hóa đơn). */
  hasEverHadBillableOccupancy: boolean;
  latestRegistration: RegistrationRequest | null;
  refresh: () => Promise<void>;
};

/**
 * Nguồn dữ liệu occupancy status DÙNG CHUNG cho các trang cần guard theo trạng thái lưu trú
 * (Hoạt động của tôi, Yêu cầu hỗ trợ, Gia hạn lưu trú, Thanh toán) — tái dùng đúng 2 API đã có
 * sẵn (getMyRegistration, getMyRegistrationHistory), không gọi API mới.
 */
export function useOccupancyStatus(): UseOccupancyStatusResult {
  const studentEmail = useAuthStore((state) => state.user?.email ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [latestRegistration, setLatestRegistration] = useState<RegistrationRequest | null>(null);
  const [history, setHistory] = useState<RegistrationRequest[]>([]);

  const refresh = useCallback(async () => {
    if (!studentEmail) {
      setLatestRegistration(null);
      setHistory([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [latest, hist] = await Promise.all([
        getMyRegistration(studentEmail),
        getMyRegistrationHistory(studentEmail),
      ]);
      setLatestRegistration(latest);
      setHistory(hist);
    } catch {
      setLatestRegistration(null);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [studentEmail]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const currentOccupancyStatus = latestRegistration?.occupancy_status ?? null;
  const isCurrentlyActive = currentOccupancyStatus === "ACTIVE";
  const hasEverBeenActive = history.some(
    (r) => r.occupancy_status && ACTIVE_OR_LATER_STATUSES.has(r.occupancy_status),
  );
  const hasEverHadBillableOccupancy = history.some(
    (r) => r.occupancy_status && BILLABLE_OR_LATER_STATUSES.has(r.occupancy_status),
  );

  return {
    isLoading,
    currentOccupancyStatus,
    isCurrentlyActive,
    hasEverBeenActive,
    hasEverHadBillableOccupancy,
    latestRegistration,
    refresh,
  };
}
