import { Outlet, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function AdminLayout() {
  const navigate = useNavigate();
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : null;
  const userName = user?.fullName || user?.email || "Admin User";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="flex min-h-screen">
        <Sidebar role="admin" />

        <div className="flex min-h-screen flex-1 flex-col">
          <Header userName={userName} onLogout={handleLogout} />

          <div className="flex-1 p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
