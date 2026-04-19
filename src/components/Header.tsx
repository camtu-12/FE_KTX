import { LogOut } from "lucide-react";

type HeaderProps = {
  userName: string;
  onLogout: () => void;
};

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "U";
  }

  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export default function Header({ userName, onLogout }: HeaderProps) {
  const initials = getInitials(userName);

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-white px-6 shadow-sm">
      <h2 className="text-base font-semibold text-[var(--color-title)]">Workspace</h2>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-primary-soft)] px-2 py-1 pr-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">
            {initials}
          </div>
          <span className="text-sm font-medium text-[var(--color-content)]">{userName}</span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
