import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { clearAuthStorage, getStoredAuth } from "../modules/auth/utils/authStorage";

export default function StudentLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const user = getStoredAuth()?.user ?? null;
  const userName = user?.fullName || user?.email || "Student User";
  const studentCode = user?.studentCode || "DH52201699";
  const userEmail = user?.email || "student@stu.edu.vn";

  const handleLogout = () => {
    clearAuthStorage();
    navigate("/login");
  };

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#f7faff_0%,#edf2f8_42%,#e8eef7_100%)]">
      <Header
        role="student"
        userName={userName}
        userEmail={userEmail}
        studentCode={studentCode}
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
              <Sidebar role="student" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex h-full flex-1 flex-col">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
            className="flex-1 overflow-hidden bg-white/35 px-6 pt-1"
          >
            <Outlet />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
