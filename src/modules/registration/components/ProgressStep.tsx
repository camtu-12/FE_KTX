import { Check } from "lucide-react";

type ProgressStepProps = {
  currentStep: number;
};

const steps = ["Gửi đơn", "Được duyệt", "Nhận phòng", "Chọn giường", "Ký hợp đồng"] as const;

export default function ProgressStep({ currentStep }: ProgressStepProps) {
  const safeStep = Math.min(5, Math.max(1, Math.floor(currentStep)));

  return (
    <section className="rounded-2xl border border-[#c9d8ef] bg-[linear-gradient(180deg,#eef5ff_0%,#e7f0ff_42%,#edf4fd_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_12px_28px_rgba(36,76,184,0.10)] backdrop-blur-sm sm:p-5">
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[720px] items-center px-1">
          {steps.map((label, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < safeStep;
            const isCurrent = stepNumber === safeStep;
            const isUpcoming = stepNumber > safeStep;

            return (
              <div key={label} className="flex flex-1 items-center">
                <div className="group flex w-[120px] flex-col items-center text-center sm:w-[140px]">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold transition-all duration-200 group-hover:-translate-y-0.5 ${
                      isCompleted
                        ? "border-[#244CB8] bg-[#244CB8] text-white shadow-[0_10px_22px_rgba(36,76,184,0.20)]"
                        : isCurrent
                          ? "border-[#173D97] bg-[#173D97] text-white ring-4 ring-[#244CB8]/14 shadow-[0_12px_24px_rgba(36,76,184,0.22)]"
                          : "border-[#D6E2F1] bg-[#F6F9FD] text-[#5A7094] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                    }`}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : stepNumber}
                  </div>
                  <p
                    className={`mt-2 text-xs font-semibold leading-5 sm:text-sm ${
                      isUpcoming ? "text-[#5A7094]" : "text-[#1f3152]"
                    }`}
                  >
                    {label}
                  </p>
                </div>

                {index < steps.length - 1 ? (
                  <div
                    className={`mx-2 h-[3px] flex-1 rounded-full transition-colors duration-200 ${
                      stepNumber < safeStep
                        ? "bg-[#244CB8]"
                        : stepNumber === safeStep
                          ? "bg-[#2F83C9]/70"
                          : "bg-[#D6E2F1]"
                    }`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
