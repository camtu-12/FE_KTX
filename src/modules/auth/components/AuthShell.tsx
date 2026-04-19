import type { ReactNode } from "react";
import AuthShowcase from "./AuthShowcase";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#F7FBFC_0%,#ECF6F8_100%)]">
      <div className="grid h-screen w-full lg:grid-cols-[1fr_1fr]">
        <div className="hidden h-screen lg:block">
          <AuthShowcase
            eyebrow={eyebrow}
            title={title}
            description={description}
          />
        </div>

        <div className="flex h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#F8FCFD_0%,#F1F7F9_100%)] px-5 py-6 sm:px-8 lg:px-14 lg:py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
