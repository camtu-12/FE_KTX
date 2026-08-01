import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
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
import AdminSupportRequestsPage from "../modules/admin/pages/AdminSupportRequestsPage";
import AdminExtensionRequestsPage from "../modules/admin/pages/AdminExtensionRequestsPage";
import AdminOccupancyPeriodsPage from "../modules/admin/pages/AdminOccupancyPeriodsPage";
import AdminElectricityPage from "../modules/admin/pages/AdminElectricityPage";
import AdminRoomFeePage from "../modules/admin/pages/AdminRoomFeePage";
import AdminFeeDiscountPage from "../modules/admin/pages/AdminFeeDiscountPage";
import LoginPage from "../modules/auth/pages/LoginPage";
import RegisterPage from "../modules/auth/pages/RegisterPage";
import AboutPage from "../modules/public/pages/AboutPage";
import AdminContentAboutPage from "../modules/admin/pages/AdminContentAboutPage";
import AdminSystemAnnouncementsPage from "../modules/admin/pages/AdminSystemAnnouncementsPage";
import AdmissionCandidateManagementPage from "../modules/admin/pages/AdmissionCandidateManagementPage";
import DormReservationManagementPage from "../modules/admin/pages/DormReservationManagementPage";
import FreshmanReservationPage from "../modules/public/pages/FreshmanReservationPage";
import FreshmanReservationStatusPage from "../modules/public/pages/FreshmanReservationStatusPage";
import ApplicationDocumentsPage from "../modules/public/pages/ApplicationDocumentsPage";
import ContactPage from "../modules/public/pages/ContactPage";
import EligibilityPage from "../modules/public/pages/EligibilityPage";
import HomePage from "../modules/public/pages/HomePage";
import RegistrationProcessPage from "../modules/public/pages/RegistrationProcessPage";
import RegistrationPage from "../modules/registration/pages/RegistrationPage";
import RoomStatusPage from "../modules/registration/pages/RoomStatusPage";
import StudentDashboardPage from "../modules/student/pages/StudentDashboardPage";
import SelectBedPage from "../modules/student/pages/SelectBedPage";
import BedSelectionPage from "../modules/student/pages/BedSelectionPage";
import MyRoomPage from "../modules/student/pages/MyRoomPage";
import StudentProfilePage from "../modules/student/pages/StudentProfilePage";
import PaymentPage from "../modules/student/pages/PaymentPage";
import MyActivitiesPage from "../modules/student/pages/MyActivitiesPage";
import StudentSupportPage from "../modules/student/pages/StudentSupportPage";
import StudentExtensionPage from "../modules/student/pages/StudentExtensionPage";
import StudentNotificationsPage from "../modules/student/pages/StudentNotificationsPage";
import ProtectedRoute from "./ProtectedRoute";
import ForgotPassword from "../modules/auth/pages/ForgotPassword";
import ChangePasswordPage from "../modules/auth/pages/ChangePasswordPage";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="dieu-kien-noi-tru" element={<EligibilityPage />} />
          <Route path="ho-so-can-chuan-bi" element={<ApplicationDocumentsPage />} />
          <Route path="quy-trinh-xet-duyet" element={<RegistrationProcessPage />} />
          <Route path="freshman-reservation" element={<FreshmanReservationPage />} />
          <Route path="freshman-reservation/status" element={<FreshmanReservationStatusPage />} />
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
          <Route path="support-requests" element={<AdminSupportRequestsPage />} />
          <Route path="extensions" element={<AdminExtensionRequestsPage />} />
          <Route path="occupancy-periods" element={<AdminOccupancyPeriodsPage />} />
          <Route path="payments" element={<Navigate to="/admin/payments/room-fees" replace />} />
          <Route path="payments/room-fees" element={<AdminRoomFeePage />} />
          <Route path="payments/electricity" element={<AdminElectricityPage />} />
          <Route path="payments/fee-discounts" element={<AdminFeeDiscountPage />} />
          <Route path="students" element={<AdminStudentsPage />} />
          <Route path="rooms" element={<AdminRoomManagement />} />
          <Route path="buildings" element={<AdminBuildingManagement />} />
          <Route path="buildings/:buildingCode" element={<AdminBuildingDetailPage />} />
          <Route path="content/about" element={<AdminContentAboutPage />} />
          <Route path="content/announcements" element={<AdminSystemAnnouncementsPage />} />
          <Route path="content/announcements/create" element={<AdminSystemAnnouncementsPage />} />
          <Route path="content/announcements/:id" element={<AdminSystemAnnouncementsPage />} />
          <Route path="content/announcements/:id/edit" element={<AdminSystemAnnouncementsPage />} />
          <Route path="admission-candidates" element={<AdmissionCandidateManagementPage />} />
          <Route path="dorm-reservations" element={<DormReservationManagementPage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
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
          <Route path="profile" element={<StudentProfilePage />} />
          <Route path="registration" element={<RegistrationPage />} />
          <Route path="room-status" element={<RoomStatusPage />} />
          <Route path="room" element={<MyRoomPage />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route path="activities" element={<MyActivitiesPage />} />
          <Route path="support" element={<StudentSupportPage />} />
          <Route path="extension" element={<StudentExtensionPage />} />
          <Route path="notifications" element={<StudentNotificationsPage />} />
          <Route path="select-bed" element={<SelectBedPage />} />
          <Route path="bed-selection" element={<BedSelectionPage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}


