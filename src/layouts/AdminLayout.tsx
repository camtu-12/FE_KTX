import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { clearAuthStorage, getStoredAuth } from "../modules/auth/utils/authStorage";

export type AdminLayoutOutletContext = {
  headerSearchValue: string;
  setHeaderSearchValue: Dispatch<SetStateAction<string>>;
};

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [headerSearchValue, setHeaderSearchValue] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredAuth()?.user ?? null;
  const userName = user?.fullName || user?.email || "Admin User";
  const userEmail = user?.email || "admin@stu.edu.vn";
  const isRegistrationsPage = location.pathname === "/admin/registrations";
  const isAssignRoomListPage = location.pathname === "/admin/assign-room";
  const isBedManagementPage = location.pathname === "/admin/bed-management";
  const isRoomManagementPage = location.pathname === "/admin/rooms";
  const isBuildingManagementPage = location.pathname === "/admin/buildings";
  const isSearchEnabled =
    isRegistrationsPage || isAssignRoomListPage || isBedManagementPage || isRoomManagementPage || isBuildingManagementPage;
  const searchPlaceholder = isRoomManagementPage
    ? "Tìm theo số phòng..."
    : isBuildingManagementPage
      ? "Tìm theo mã, tên hoặc địa chỉ tòa..."
    : "Tìm theo MSSV, họ tên hoặc email";

  const handleLogout = () => {
    clearAuthStorage();
    navigate("/login");
  };

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#f7faff_0%,#edf2f8_42%,#e8eef7_100%)]">
      <Header
        role="admin"
        userName={userName}
        userEmail={userEmail}
        searchValue={isSearchEnabled ? headerSearchValue : undefined}
        searchPlaceholder={isSearchEnabled ? searchPlaceholder : undefined}
        onSearchChange={isSearchEnabled ? setHeaderSearchValue : undefined}
        onLogout={handleLogout}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      <div className="relative z-0 flex h-[calc(100vh-5rem)]">
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.div
              initial={{ x: -36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -36, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex"
            >
              <Sidebar role="admin" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
            className="auth-scrollbar min-w-0 flex-1 overflow-y-auto bg-white/35 px-6 pb-6 pt-1"
          >
            <Outlet context={{ headerSearchValue, setHeaderSearchValue }} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
