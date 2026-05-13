import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import PublicLayout from "../layouts/PublicLayout";
import StudentLayout from "../layouts/StudentLayout";
import AdminDashboardPage from "../modules/admin/pages/AdminDashboardPage";
import AdminRegistrationDetailPage from "../modules/admin/pages/AdminRegistrationDetailPage";
import AdminRegistrationsPage from "../modules/admin/pages/AdminRegistrationsPage";
import BedManagementPage from "../modules/admin/pages/BedManagementPage";
import AdminRoomManagement from "../modules/admin/pages/AdminRoomManagement";
import AssignRoomPage from "../modules/admin/pages/AssignRoomPage.tsx";
import AssignRoomDetailPage from "../modules/admin/pages/AssignRoomDetailPage";
import AdminStudentsPage from "../modules/admin/pages/AdminStudentsPage";
import LoginPage from "../modules/auth/pages/LoginPage";
import RegisterPage from "../modules/auth/pages/RegisterPage";
import AboutPage from "../modules/public/pages/AboutPage";
import ContactPage from "../modules/public/pages/ContactPage";
import HomePage from "../modules/public/pages/HomePage";
import RegistrationPage from "../modules/registration/pages/RegistrationPage";
import StudentDashboardPage from "../modules/student/pages/StudentDashboardPage";
import SelectBedPage from "../modules/student/pages/SelectBedPage";
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
          <Route path="assign-room" element={<AssignRoomPage />} />
          <Route path="assign-room/:requestId" element={<AssignRoomDetailPage />} />
          <Route path="bed-management" element={<BedManagementPage />} />
          <Route path="students" element={<AdminStudentsPage />} />
          <Route path="rooms" element={<AdminRoomManagement />} />
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
          <Route path="select-bed" element={<SelectBedPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}


