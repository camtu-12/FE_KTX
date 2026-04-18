import { BedSingle, CreditCard, LogOut, ScrollText } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";

export default function StudentLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-content)]">
      <aside className="flex w-64 flex-col border-r border-[var(--color-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f4fcfd_100%)] px-5 py-6 shadow-sm">
        <div className="mb-8 rounded-2xl bg-[rgba(213,243,247,0.7)] p-4">
          <h2 className="text-xl font-extrabold text-[var(--color-title)]">
            STU Student
          </h2>
          <p className="mt-1 text-sm text-[var(--color-content)]">
            Cổng thông tin sinh viên nội trú
          </p>
        </div>

        <nav className="space-y-2">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl bg-[linear-gradient(135deg,#38B8C8_0%,#249FB0_100%)] px-4 py-3 text-left font-semibold text-white shadow-[0_10px_22px_rgba(56,184,200,0.22)] transition hover:brightness-95"
            onClick={() => navigate("/student/dashboard")}
          >
            <ScrollText size={18} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-[var(--color-content)] transition hover:bg-[rgba(213,243,247,0.5)] hover:text-[var(--color-primary-hover)]"
          >
            <BedSingle size={18} />
            <span>Chỗ ở</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-[var(--color-content)] transition hover:bg-[rgba(213,243,247,0.5)] hover:text-[var(--color-primary-hover)]"
          >
            <CreditCard size={18} />
            <span>Thanh toán</span>
          </button>
        </nav>
      </aside>

      <main className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f4fcfd_100%)] px-6 py-4 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-title)]">
              Student Dashboard
            </h1>
            <p className="text-sm text-[var(--color-content)]">
              Theo dõi đơn đăng ký, hợp đồng và thông tin nội trú
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-[rgba(56,184,200,0.22)] bg-[rgba(213,243,247,0.6)] px-4 py-2 font-semibold text-[var(--color-primary-hover)] transition hover:border-[var(--color-primary)] hover:bg-[rgba(213,243,247,0.9)]"
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
