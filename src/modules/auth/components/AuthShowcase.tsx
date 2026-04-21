type AuthShowcaseProps = {
  eyebrow: string;
  title: string;
  description: string;
};


export default function AuthShowcase({
  eyebrow,
  title,
  description,
}: AuthShowcaseProps) {
  return (
    <div className="relative flex h-full flex-col justify-center overflow-hidden bg-[linear-gradient(160deg,#102b66_0%,#1c46a7_45%,#0a1f58_100%)] px-4 py-5 text-white sm:px-5 sm:py-6 lg:px-6 lg:py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(120,166,255,0.18),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_24%)]" />
      <div className="absolute -left-14 top-10 h-52 w-52 rounded-full border border-white/10" />
      <div className="absolute right-[-3rem] top-[-2rem] h-36 w-36 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-[-3rem] left-[20%] h-40 w-40 rounded-full bg-[#9fc0ff]/20 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-[23rem]">
        <div>
          <div className="relative -translate-y-2.5 inline-flex items-center rounded-full bg-[#8be8df] px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.13em] text-[#0d5f67] shadow-[0_10px_28px_rgba(139,232,223,0.18)] sm:text-xs">
            {eyebrow}
          </div>
          <h1 className="auth-display mt-4 max-w-[19rem] text-[clamp(1.35rem,1.9vw,2rem)] font-semibold leading-[1.34] tracking-[-0.02em] sm:max-w-[20rem]">
            {title}
          </h1>
          <p className="mt-5 max-w-[21rem] text-[0.94rem] leading-7 text-white/82 sm:text-[0.98rem]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
