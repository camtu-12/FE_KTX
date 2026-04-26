import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Clock3, Funnel, X } from "lucide-react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import { getRegistrationRequests, updateRegistrationStatus } from "../../../api/registrationMockApi";
import {
  registrationRequests,
  statusMap,
  type RegistrationRequest,
  type RegistrationFilterStatus,
  type RegistrationStatus,
} from "../data/registrationRequests";

const statusIconMap: Record<RegistrationStatus, typeof Clock3> = {
  pending: Clock3,
  approved: CheckCircle2,
  rejected: CircleAlert,
};

export default function AdminRegistrationsPage() {
  const { headerSearchValue } = useOutletContext<AdminLayoutOutletContext>();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as
    | { openRequestId?: number; requestModalTab?: "info" | "history" }
    | null;
  const [shouldSkipInitialModalAnimation] = useState(() => Boolean(routeState?.openRequestId));
  const [requests, setRequests] = useState(registrationRequests);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RegistrationFilterStatus>("all");
  const [draftStatusFilter, setDraftStatusFilter] = useState<RegistrationFilterStatus>("all");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [viewingRequestId, setViewingRequestId] = useState<number | null>(routeState?.openRequestId ?? null);
  const [requestModalTab, setRequestModalTab] = useState<"info" | "history">(routeState?.requestModalTab ?? "info");

  const visibleRequests = useMemo(() => {
    const normalized = headerSearchValue.trim().toLowerCase();
    const latestByEmail = new Map<string, (typeof requests)[number]>();

    requests.forEach((request) => {
      const key = request.email.trim().toLowerCase();
      if (!latestByEmail.has(key)) {
        latestByEmail.set(key, request);
      }
    });

    return Array.from(latestByEmail.values()).filter((request) => {
      const matchesKeyword =
        !normalized ||
        [request.formData.mssv, request.formData.fullName, request.email]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      const matchesStatus = statusFilter === "all" || request.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [headerSearchValue, requests, statusFilter]);

  const selectedRequest = useMemo(() => {
    if (!viewingRequestId) {
      return null;
    }

    return requests.find((request) => request.id === viewingRequestId) ?? null;
  }, [requests, viewingRequestId]);

  const selectedRequestHistory = useMemo(() => {
    if (!selectedRequest) {
      return [];
    }

    const emailKey = selectedRequest.email.trim().toLowerCase();

    return requests
      .filter((request) => request.email.trim().toLowerCase() === emailKey)
      .sort((a, b) => a.id - b.id);
  }, [requests, selectedRequest]);

  const pendingCount = requests.filter((item) => item.status === "pending").length;
  const approvedCount = requests.filter((item) => item.status === "approved").length;
  const rejectedCount = requests.filter((item) => item.status === "rejected").length;

  const summaryCards = [
    {
      label: "Chờ duyệt",
      value: pendingCount,
      valueClassName: "text-[#9b6b00]",
      delay: 0.12,
    },
    {
      label: "Đã duyệt",
      value: approvedCount,
      valueClassName: "text-[#16784b]",
      delay: 0.18,
    },
    {
      label: "Từ chối",
      value: rejectedCount,
      valueClassName: "text-[#bf3e53]",
      delay: 0.24,
    },
  ];

  const statusFilterOptions: Array<{ value: RegistrationFilterStatus; label: string }> = [
    { value: "all", label: "Tất cả" },
    { value: "pending", label: "Chờ duyệt" },
    { value: "approved", label: "Đã duyệt" },
    { value: "rejected", label: "Từ chối" },
  ];

  useEffect(() => {
    let isMounted = true;

    const loadRequests = async () => {
      const nextRequests = await getRegistrationRequests();
      if (isMounted) {
        setRequests(nextRequests);
      }
    };

    void loadRequests();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const nextState = viewingRequestId
      ? { openRequestId: viewingRequestId, requestModalTab }
      : null;
    const currentOpenRequestId = routeState?.openRequestId ?? null;
    const currentTab = routeState?.requestModalTab ?? "info";

    if (
      nextState?.openRequestId === currentOpenRequestId &&
      nextState?.requestModalTab === currentTab
    ) {
      return;
    }

    if (!nextState && !routeState) {
      return;
    }

    navigate(location.pathname, { replace: true, state: nextState });
  }, [location.pathname, navigate, requestModalTab, routeState, viewingRequestId]);

  const handleApprove = async (id: number) => {
    setIsUpdatingStatus(true);
    try {
      const updated = await updateRegistrationStatus({ id, status: "approved" });
      setRequests((prev) => prev.map((request) => (request.id === id ? updated : request)));
    } catch {
      // Ignore stale-row actions when status was already updated.
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOpenRejectModal = (id: number) => {
    setRejectingRequestId(id);
    setRejectionReason("");
  };

  const handleCloseRejectModal = () => {
    setRejectingRequestId(null);
    setRejectionReason("");
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequestId || !rejectionReason.trim()) {
      return;
    }

    setIsUpdatingStatus(true);

    try {
      const updated = await updateRegistrationStatus({
        id: rejectingRequestId,
        status: "rejected",
        rejectionReason,
      });

      setRequests((prev) =>
        prev.map((request) => (request.id === rejectingRequestId ? updated : request)),
      );
    } catch {
      // Ignore stale-row actions when status was already updated.
    } finally {
      setIsUpdatingStatus(false);
    }

    handleCloseRejectModal();
  };

  const handleOpenStatusFilter = () => {
    setDraftStatusFilter(statusFilter);
    setIsStatusFilterOpen(true);
  };

  const handleResetStatusFilter = () => {
    setDraftStatusFilter("all");
    setStatusFilter("all");
    setIsStatusFilterOpen(false);
  };

  const handleApplyStatusFilter = () => {
    setStatusFilter(draftStatusFilter);
    setIsStatusFilterOpen(false);
  };

  const handleOpenRequestModal = (request: RegistrationRequest) => {
    setViewingRequestId(request.id);
    setRequestModalTab("info");
  };

  const handleCloseRequestModal = () => {
    setViewingRequestId(null);
    setRequestModalTab("info");
  };

  return (
    <>
      <motion.section
        initial={shouldSkipInitialModalAnimation ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex min-h-full flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        <motion.div
          transition={{ duration: 0.2 }}
          className="auth-reveal is-visible rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-sm transition-all duration-300 ease-out hover:shadow-[0_24px_56px_rgba(36,76,184,0.14)] sm:px-8"
        >
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">
              Quản lý đơn đăng ký
            </h1>
            <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[#62789f] sm:text-sm">
              Theo dõi danh sách hồ sơ đăng ký ký túc xá, phê duyệt nhanh và phản hồi rõ lý do khi cần từ chối.
            </p>
          </div>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map((card) => (
            <motion.article
              key={card.label}
              initial={shouldSkipInitialModalAnimation ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: card.delay, ease: "easeOut" }}
              className="flex flex-col items-center rounded-[24px] border border-[#d8e4f5] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-5 py-4 text-center shadow-[0_14px_30px_rgba(36,76,184,0.08)]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7c8fb5]">
                {card.label}
              </p>
              <p className={`mt-3 text-[2rem] font-extrabold leading-none ${card.valueClassName}`}>
                {card.value}
              </p>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={shouldSkipInitialModalAnimation ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.46, delay: 0.16, ease: "easeOut" }}
          className="p-0"
        >
          <div className="auth-scrollbar mt-1 overflow-x-auto rounded-[24px] border border-[#d6e2f1] bg-white">
            <table className="min-w-[920px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">
                    MSSV
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">
                    Họ tên
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">
                    Email
                  </th>
                  <th className="relative px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">
                    <div className="inline-flex items-center justify-center gap-2">
                      <span>Trạng thái</span>
                      <button
                        type="button"
                        onClick={isStatusFilterOpen ? () => setIsStatusFilterOpen(false) : handleOpenStatusFilter}
                        className={`flex items-center justify-center transition ${
                          statusFilter !== "all"
                            ? "text-[#244cb8]"
                            : "text-[#6f84ad] hover:text-[#244cb8]"
                        }`}
                      >
                        <Funnel className="h-3 w-3" />
                      </button>
                    </div>

                    {isStatusFilterOpen ? (
                      <div className="absolute left-1/2 top-[calc(100%+2px)] z-20 w-[132px] -translate-x-1/2 overflow-hidden rounded-[18px] border border-[#d7e2f2] bg-white text-left normal-case shadow-[0_14px_30px_rgba(15,23,42,0.16)]">
                        <div className="space-y-0.5 p-2.5">
                          {statusFilterOptions.map((option) => {
                            const isSelected = draftStatusFilter === option.value;

                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setDraftStatusFilter(option.value)}
                                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                              >
                                <span
                                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                    isSelected
                                      ? "border-[#244cb8] bg-[#244cb8]/10"
                                      : "border-[#cfd9e8] bg-white"
                                  }`}
                                >
                                  <span
                                    className={`h-2 w-2 rounded-full ${
                                      isSelected ? "bg-[#244cb8]" : "bg-transparent"
                                    }`}
                                  />
                                </span>
                                <span>{option.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between border-t border-[#dbe5f3] px-2.5 py-2">
                          <button
                            type="button"
                            onClick={handleResetStatusFilter}
                            className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]"
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            onClick={handleApplyStatusFilter}
                            className="rounded-xl bg-[#0c4f97] px-3 py-1.5 text-[10px] font-semibold tracking-normal text-white shadow-[0_8px_16px_rgba(12,79,151,0.22)] transition hover:brightness-110"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">
                    Hành động
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">
                    Xử lý
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRequests.map((request, index) => {
                  const statusUi = statusMap[request.status];
                  const StatusIcon = statusIconMap[request.status];
                  const isApproved = request.status === "approved";
                  const isPending = request.status === "pending";

                  return (
                    <motion.tr
                      key={request.id}
                      initial={shouldSkipInitialModalAnimation ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: 0.22 + index * 0.06,
                        ease: "easeOut",
                      }}
                      className="group transition duration-200 hover:bg-[#f8fbff]"
                    >
                      <td className="border-t border-[#e8eef8] px-5 py-4 text-center text-sm font-semibold text-[#24407f]">
                        {request.formData.mssv}
                      </td>
                      <td className="border-t border-[#e8eef8] px-5 py-4 text-center text-sm font-semibold text-[#1f3152]">
                        {request.formData.fullName}
                      </td>
                      <td className="border-t border-[#e8eef8] px-5 py-4 text-center text-sm text-[#5d7299]">
                        {request.email}
                        {request.status === "rejected" && request.rejectionReason ? (
                          <p className="mt-1 text-xs leading-6 text-[#bf3e53]">
                            Lý do: {request.rejectionReason}
                          </p>
                        ) : null}
                      </td>
                      <td className="border-t border-[#e8eef8] px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${statusUi.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          <span>{statusUi.label}</span>
                        </span>
                      </td>
                      <td className="border-t border-[#e8eef8] px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenRequestModal(request)}
                          className="inline-flex rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 py-2 text-sm font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
                        >
                          Xem đơn
                        </button>
                      </td>
                      <td className="border-t border-[#e8eef8] px-5 py-4 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {isApproved ? (
                            <Link
                              to="/admin/rooms"
                              state={{ registrationRequest: request }}
                              className="rounded-xl bg-[linear-gradient(135deg,#1762c3_0%,#2f80ed_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(23,98,195,0.22)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
                            >
                              Phân phòng
                            </Link>
                          ) : isPending ? (
                            <>
                            <button
                              type="button"
                              disabled={isUpdatingStatus}
                              onClick={() => {
                                void handleApprove(request.id);
                              }}
                              className="rounded-xl bg-[linear-gradient(135deg,#1f9a60_0%,#35bf7a_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(31,154,96,0.22)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                            >
                              Duyệt
                            </button>
                            <button
                              type="button"
                              disabled={isUpdatingStatus}
                              onClick={() => handleOpenRejectModal(request.id)}
                              className="rounded-xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(204,60,79,0.20)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                            >
                              Từ chối
                            </button>
                            </>
                          ) : (
                            <span className="rounded-xl border border-[#d1daea] bg-[#f6f8fc] px-4 py-2 text-sm font-semibold text-[#7f8da8]">
                              Chờ gửi lại
                            </span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.section>

      <AnimatePresence initial={!shouldSkipInitialModalAnimation}>
        {selectedRequest ? (
          <motion.div
            initial={shouldSkipInitialModalAnimation ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 z-[72] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={shouldSkipInitialModalAnimation ? false : { opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-2xl rounded-[28px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_72%,#e7f0ff_100%)] p-6 shadow-[0_28px_70px_rgba(27,56,122,0.28)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="mt-2 text-2xl font-bold text-[#173a78]">Chi tiết hồ sơ</h3>
                  <p className="mt-2 text-sm leading-7 text-[#4f6894]">Họ và tên: {selectedRequest.formData.fullName}</p>
                  <p className="text-sm leading-7 text-[#4f6894]">Email: {selectedRequest.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseRequestModal}
                  className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 inline-flex rounded-2xl border border-[#c6d8f0] bg-[#f2f7ff] p-1">
                <button
                  type="button"
                  onClick={() => setRequestModalTab("info")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    requestModalTab === "info"
                      ? "bg-white text-[#244cb8] shadow-[0_8px_16px_rgba(36,76,184,0.16)]"
                      : "text-[#6a81aa] hover:text-[#244cb8]"
                  }`}
                >
                  Thông tin đơn
                </button>
                <button
                  type="button"
                  onClick={() => setRequestModalTab("history")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    requestModalTab === "history"
                      ? "bg-white text-[#244cb8] shadow-[0_8px_16px_rgba(36,76,184,0.16)]"
                      : "text-[#6a81aa] hover:text-[#244cb8]"
                  }`}
                >
                  Lịch sử
                </button>
              </div>

              {requestModalTab === "info" ? (
                <div className="mt-5 space-y-3 rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                  <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <p className="text-[#5570a0]">MSSV: <span className="font-semibold text-[#1b3766]">{selectedRequest.formData.mssv}</span></p>
                    <p className="text-[#5570a0]">Lớp: <span className="font-semibold text-[#1b3766]">{selectedRequest.formData.class}</span></p>
                    <p className="text-[#5570a0]">Khoa: <span className="font-semibold text-[#1b3766]">{selectedRequest.formData.department}</span></p>
                    <p className="text-[#5570a0]">Nộp lúc: <span className="font-semibold text-[#1b3766]">{selectedRequest.submittedAt}</span></p>
                    <p className="text-[#5570a0]">Trạng thái: <span className="font-semibold text-[#1b3766]">{statusMap[selectedRequest.status].label}</span></p>
                  </div>
                  {selectedRequest.rejectionReason ? (
                    <p className="rounded-xl border border-[#f1c2c8] bg-[#fff4f6] px-3 py-2 text-sm text-[#bf3e53]">
                      Lý do từ chối: {selectedRequest.rejectionReason}
                    </p>
                  ) : null}
                  <div>
                    <Link
                      to={`/admin/registrations/${selectedRequest.id}`}
                      state={{ request: selectedRequest, returnToModal: true }}
                      className="inline-flex rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 py-2 text-sm font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
                    >
                      Mở trang chi tiết
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-5 max-h-[52vh] space-y-3 overflow-y-auto rounded-2xl border border-[#d3e0f2] bg-white/55 p-2 pr-3">
                  {selectedRequestHistory.map((historyRequest, index) => {
                    const itemStatus = statusMap[historyRequest.status];

                    return (
                      <div
                        key={historyRequest.id}
                        className="rounded-2xl border border-[#c8d9f0] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 py-3 shadow-[0_10px_22px_rgba(36,76,184,0.10)]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[#1b3766]">Lần nộp {index + 1}</p>
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${itemStatus.className}`}
                          >
                            {itemStatus.label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[#5570a0]">Nộp lúc: {historyRequest.submittedAt}</p>
                        {historyRequest.rejectionReason ? (
                          <p className="mt-1 text-sm text-[#bf3e53]">Lý do: {historyRequest.rejectionReason}</p>
                        ) : null}
                        <div className="mt-3">
                          <Link
                            to={`/admin/registrations/${historyRequest.id}`}
                            state={{ request: historyRequest, returnToModal: true }}
                            className="inline-flex rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-3.5 py-1.5 text-xs font-semibold text-[#244cb8] shadow-[0_8px_16px_rgba(36,76,184,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
                          >
                            Xem chi tiết
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleCloseRequestModal}
                  className="rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {rejectingRequestId ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-xl rounded-[28px] border border-[#d5e1f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_28px_70px_rgba(15,23,42,0.24)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7d90b5]">
                    Phản hồi hồ sơ
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-[#1a2d52]">
                    Từ chối đơn đăng ký
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[#61779d]">
                    Nhập lý do để sinh viên biết cần bổ sung hoặc chỉnh sửa thông tin nào.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseRejectModal}
                  className="rounded-xl border border-[#d5e1f2] bg-white p-2 text-[#6c80a8] transition hover:border-[#b8caea] hover:text-[#244cb8]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#667ca8]">
                  Lý do từ chối
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={"Ví dụ: Ảnh CCCD chưa rõ nét, thiếu thông tin người thân..."}
                  rows={5}
                  className="w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-4 py-3 text-sm text-[#1f3152] outline-none transition placeholder:text-[#8ea1c0] focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseRejectModal}
                  className="rounded-2xl border border-[#c9d8ef] bg-white px-5 py-2.5 text-sm font-semibold text-[#4b6494] transition hover:border-[#adc3e8] hover:text-[#244cb8]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!rejectionReason.trim() || isUpdatingStatus}
                  onClick={() => {
                    void handleConfirmReject();
                  }}
                  className="rounded-2xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(204,60,79,0.22)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
