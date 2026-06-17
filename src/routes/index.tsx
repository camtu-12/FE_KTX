import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import PublicLayout from "../layouts/PublicLayout";
import StudentLayout from "../layouts/StudentLayout";
import AdminDashboardPage from "../modules/admin/pages/AdminDashboardPage";
import AdminRegistrationDetailPage from "../modules/admin/pages/AdminRegistrationDetailPage";
import AdminRegistrationsPage from "../modules/admin/pages/AdminRegistrationsPage";
import AdminRegistrationPeriodsPage from "../modules/admin/pages/AdminRegistrationPeriodsPage";
import BedManagementPage from "../modules/admin/pages/BedManagementPage";
import AdminRoomManagement from "../modules/admin/pages/AdminRoomManagement";
import AdminBuildingManagement from "../modules/admin/pages/AdminBuildingManagement";
import AdminBuildingDetailPage from "../modules/admin/pages/AdminBuildingDetailPage";
import AssignRoomPage from "../modules/admin/pages/AssignRoomPage.tsx";
import AssignRoomDetailPage from "../modules/admin/pages/AssignRoomDetailPage";
import AdminStudentsPage from "../modules/admin/pages/AdminStudentsPage";
import OccupancyManagementPage from "../modules/admin/pages/OccupancyManagementPage";
import ViolationManagementPage from "../modules/admin/pages/ViolationManagementPage";
import ViolationTypeManagementPage from "../modules/admin/pages/ViolationTypeManagementPage";
import AdminElectricityPage from "../modules/admin/pages/AdminElectricityPage";
import AdminRoomFeePage from "../modules/admin/pages/AdminRoomFeePage";
import LoginPage from "../modules/auth/pages/LoginPage";
import RegisterPage from "../modules/auth/pages/RegisterPage";
import AboutPage from "../modules/public/pages/AboutPage";
import ContactPage from "../modules/public/pages/ContactPage";
import HomePage from "../modules/public/pages/HomePage";
import RegistrationPage from "../modules/registration/pages/RegistrationPage";
import RoomStatusPage from "../modules/registration/pages/RoomStatusPage";
import StudentDashboardPage from "../modules/student/pages/StudentDashboardPage";
import SelectBedPage from "../modules/student/pages/SelectBedPage";
import BedSelectionPage from "../modules/student/pages/BedSelectionPage";
import MyRoomPage from "../modules/student/pages/MyRoomPage";
import PaymentPage from "../modules/student/pages/PaymentPage";
import ProtectedRoute from "./ProtectedRoute";
import ForgotPassword from "../modules/auth/pages/ForgotPassword";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="registrations" element={<AdminRegistrationsPage />} />
          <Route path="registrations/:registrationId" element={<AdminRegistrationDetailPage />} />
          <Route path="registration-periods" element={<AdminRegistrationPeriodsPage />} />
          <Route path="assign-room" element={<AssignRoomPage />} />
          <Route path="assign-room/:requestId" element={<AssignRoomDetailPage />} />
          <Route path="bed-management" element={<BedManagementPage />} />
          <Route path="occupancies" element={<OccupancyManagementPage />} />
          <Route path="violations" element={<ViolationManagementPage />} />
          <Route path="violation-types" element={<ViolationTypeManagementPage />} />
          <Route path="payments" element={<Navigate to="/admin/payments/room-fees" replace />} />
          <Route path="payments/room-fees" element={<AdminRoomFeePage />} />
          <Route path="payments/electricity" element={<AdminElectricityPage />} />
          <Route path="students" element={<AdminStudentsPage />} />
          <Route path="rooms" element={<AdminRoomManagement />} />
          <Route path="buildings" element={<AdminBuildingManagement />} />
          <Route path="buildings/:buildingCode" element={<AdminBuildingDetailPage />} />
        </Route>

        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<StudentDashboardPage />} />
          <Route path="registration" element={<RegistrationPage />} />
          <Route path="room-status" element={<RoomStatusPage />} />
          <Route path="room" element={<MyRoomPage />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route path="select-bed" element={<SelectBedPage />} />
          <Route path="bed-selection" element={<BedSelectionPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}


