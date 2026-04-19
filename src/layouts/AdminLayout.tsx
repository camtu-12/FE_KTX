import { LayoutDashboard, LogOut, ReceiptText, BedDouble } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-content)]">
      <aside className="flex w-64 flex-col border-r border-[var(--color-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f0fdfa_100%)] px-5 py-6 shadow-sm">
        <div className="mb-8 rounded-2xl bg-[rgba(204,251,241,0.6)] p-4">
          <h2 className="text-xl font-extrabold text-[var(--color-title)]">
            KTX Admin
          </h2>
          <p className="mt-1 text-sm text-[var(--color-content)]">
            Quản lý hệ thống ký túc xá
          </p>
        </div>

        <nav className="space-y-2">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl bg-[linear-gradient(135deg,#14B8A6_0%,#0D9488_100%)] px-4 py-3 text-left font-semibold text-white shadow-[0_10px_22px_rgba(20,184,166,0.22)] transition hover:brightness-95"
            onClick={() => navigate("/dashboard")}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-[var(--color-content)] transition hover:bg-[rgba(204,251,241,0.5)] hover:text-[var(--color-primary-hover)]"
          >
            <BedDouble size={18} />
            <span>Phòng</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-[var(--color-content)] transition hover:bg-[rgba(204,251,241,0.5)] hover:text-[var(--color-primary-hover)]"
          >
            <ReceiptText size={18} />
            <span>Đơn đăng ký</span>
          </button>
        </nav>
      </aside>

      <main className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f0fdfa_100%)] px-6 py-4 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-title)]">
              Admin Panel
            </h1>
            <p className="text-sm text-[var(--color-content)]">
              Theo dõi và quản lý dữ liệu hệ thống
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-[rgba(20,184,166,0.22)] bg-[rgba(204,251,241,0.45)] px-4 py-2 font-semibold text-[var(--color-primary-hover)] transition hover:border-[var(--color-primary)] hover:bg-[rgba(204,251,241,0.8)]"
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </header>

        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
