import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Clock3, Funnel, X } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import {
  registrationRequests,
  statusMap,
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
  const [requests, setRequests] = useState(registrationRequests);
  const [statusFilter, setStatusFilter] = useState<RegistrationFilterStatus>("all");
  const [draftStatusFilter, setDraftStatusFilter] = useState<RegistrationFilterStatus>("all");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const filteredRequests = useMemo(() => {
    const normalized = headerSearchValue.trim().toLowerCase();

    return requests.filter((request) => {
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

  const pendingCount = requests.filter((item) => item.status === "pending").length;
  const approvedCount = requests.filter((item) => item.status === "approved").length;
  const rejectedCount = requests.filter((item) => item.status === "rejected").length;

  const summaryCards = [
    {
      label: "Ch\u1edd duy\u1ec7t",
      value: pendingCount,
      valueClassName: "text-[#9b6b00]",
      delay: 0.12,
    },
    {
      label: "\u0110\u00e3 duy\u1ec7t",
      value: approvedCount,
      valueClassName: "text-[#16784b]",
      delay: 0.18,
    },
    {
      label: "T\u1eeb ch\u1ed1i",
      value: rejectedCount,
      valueClassName: "text-[#bf3e53]",
      delay: 0.24,
    },
  ];

  const statusFilterOptions: Array<{ value: RegistrationFilterStatus; label: string }> = [
    { value: "all", label: "T\u1ea5t c\u1ea3" },
    { value: "pending", label: "Ch\u1edd duy\u1ec7t" },
    { value: "approved", label: "\u0110\u00e3 duy\u1ec7t" },
    { value: "rejected", label: "T\u1eeb ch\u1ed1i" },
  ];

  const handleApprove = (id: number) => {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === id ? { ...request, status: "approved", rejectionReason: undefined } : request,
      ),
    );
  };

  const handleOpenRejectModal = (id: number) => {
    setRejectingRequestId(id);
    setRejectionReason("");
  };

  const handleCloseRejectModal = () => {
    setRejectingRequestId(null);
    setRejectionReason("");
  };

  const handleConfirmReject = () => {
    if (!rejectingRequestId || !rejectionReason.trim()) {
      return;
    }

    setRequests((prev) =>
      prev.map((request) =>
        request.id === rejectingRequestId
          ? {
              ...request,
              status: "rejected",
              rejectionReason: rejectionReason.trim(),
            }
          : request,
      ),
    );

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

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="h-full flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        <motion.div
          transition={{ duration: 0.2 }}
          className="auth-reveal is-visible rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-sm transition-all duration-300 ease-out hover:shadow-[0_24px_56px_rgba(36,76,184,0.14)] sm:px-8"
        >
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">
              {"Qu\u1ea3n l\u00fd \u0111\u01a1n \u0111\u0103ng k\u00fd"}
            </h1>
            <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[#62789f] sm:text-sm">
              {
                "Theo d\u00f5i danh s\u00e1ch h\u1ed3 s\u01a1 \u0111\u0103ng k\u00fd k\u00fd t\u00fac x\u00e1, ph\u00ea duy\u1ec7t nhanh v\u00e0 ph\u1ea3n h\u1ed3i r\u00f5 l\u00fd do khi c\u1ea7n t\u1eeb ch\u1ed1i."
              }
            </p>
          </div>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map((card) => (
            <motion.article
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
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
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.46, delay: 0.16, ease: "easeOut" }}
          className="p-0"
        >
          <div className="mt-1 overflow-x-auto rounded-[24px] border border-[#d6e2f1] bg-white">
            <table className="min-w-[920px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">
                    MSSV
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">
                    {"H\u1ecd t\u00ean"}
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">
                    Email
                  </th>
                  <th className="relative px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">
                    <div className="inline-flex items-center justify-center gap-2">
                      <span>{"Tr\u1ea1ng th\u00e1i"}</span>
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
                    {"H\u00e0nh \u0111\u1ed9ng"}
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">
                    {"X\u1eed l\u00fd"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request, index) => {
                  const statusUi = statusMap[request.status];
                  const StatusIcon = statusIconMap[request.status];
                  const isPending = request.status === "pending";

                  return (
                    <motion.tr
                      key={request.id}
                      initial={{ opacity: 0, y: 10 }}
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
                            {"L\u00fd do"}: {request.rejectionReason}
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
                        <Link
                          to={`/registration-detail/${request.id}`}
                          state={{ request }}
                          className="inline-flex rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 py-2 text-sm font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
                        >
                          {"Xem \u0111\u01a1n"}
                        </Link>
                      </td>
                      <td className="border-t border-[#e8eef8] px-5 py-4 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            disabled={!isPending}
                            onClick={() => handleApprove(request.id)}
                            className="rounded-xl bg-[linear-gradient(135deg,#1f9a60_0%,#35bf7a_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(31,154,96,0.22)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                          >
                            {"Duy\u1ec7t"}
                          </button>
                          <button
                            type="button"
                            disabled={!isPending}
                            onClick={() => handleOpenRejectModal(request.id)}
                            className="rounded-xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(204,60,79,0.20)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                          >
                            {"T\u1eeb ch\u1ed1i"}
                          </button>
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

      <AnimatePresence>
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
                    {"Ph\u1ea3n h\u1ed3i h\u1ed3 s\u01a1"}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-[#1a2d52]">
                    {"T\u1eeb ch\u1ed1i \u0111\u01a1n \u0111\u0103ng k\u00fd"}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[#61779d]">
                    {
                      "Nh\u1eadp l\u00fd do \u0111\u1ec3 sinh vi\u00ean bi\u1ebft c\u1ea7n b\u1ed5 sung ho\u1eb7c ch\u1ec9nh s\u1eeda th\u00f4ng tin n\u00e0o."
                    }
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
                  {"L\u00fd do t\u1eeb ch\u1ed1i"}
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={"V\u00ed d\u1ee5: \u1ea2nh CCCD ch\u01b0a r\u00f5 n\u00e9t, thi\u1ebfu th\u00f4ng tin ng\u01b0\u1eddi th\u00e2n..."}
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
                  {"H\u1ee7y"}
                </button>
                <button
                  type="button"
                  disabled={!rejectionReason.trim()}
                  onClick={handleConfirmReject}
                  className="rounded-2xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(204,60,79,0.22)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                >
                  {"X\u00e1c nh\u1eadn t\u1eeb ch\u1ed1i"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
