import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import PublicLayout from "../layouts/PublicLayout";
import StudentLayout from "../layouts/StudentLayout";
import AdminDashboardPage from "../modules/admin/pages/AdminDashboardPage";
import AdminRegistrationDetailPage from "../modules/admin/pages/AdminRegistrationDetailPage";
import AdminRegistrationsPage from "../modules/admin/pages/AdminRegistrationsPage";
import AdminRoomsPage from "../modules/admin/pages/AdminRoomsPage";
import AssignRoomPage from "../modules/admin/pages/AssignRoomPage.tsx";
import AdminStudentsPage from "../modules/admin/pages/AdminStudentsPage";
import LoginPage from "../modules/auth/pages/LoginPage";
import RegisterPage from "../modules/auth/pages/RegisterPage";
import AboutPage from "../modules/public/pages/AboutPage";
import ContactPage from "../modules/public/pages/ContactPage";
import HomePage from "../modules/public/pages/HomePage";
import RegistrationPage from "../modules/registration/pages/RegistrationPage";
import StudentDashboardPage from "../modules/student/pages/StudentDashboardPage";
import ProtectedRoute from "./ProtectedRoute";

function LegacyRegistrationDetailRedirect() {
  const location = useLocation();
  const { registrationId } = useParams();

  return (
    <Navigate
      to={registrationId ? `/admin/registrations/${registrationId}` : "/admin/registrations"}
      replace
      state={location.state}
    />
  );
}

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
        <Route path="/registration-detail/:registrationId" element={<LegacyRegistrationDetailRedirect />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="registrations" element={<AdminRegistrationsPage />} />
          <Route path="registrations/:registrationId" element={<AdminRegistrationDetailPage />} />
          <Route path="assign-room/:registrationId" element={<AssignRoomPage />} />
          <Route path="students" element={<AdminStudentsPage />} />
          <Route path="rooms" element={<AdminRoomsPage />} />
        </Route>

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<StudentDashboardPage />} />
          <Route path="registration" element={<RegistrationPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
