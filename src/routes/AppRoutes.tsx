import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import StudentLayout from "../layouts/StudentLayout";
import LoginPage from "../modules/auth/pages/LoginPage";
import RegisterPage from "../modules/auth/pages/RegisterPage";
import ForgotPassword from "../modules/auth/pages/ForgotPassword";
import ProtectedRoute from "./ProtectedRoute";

function AdminDashboard() {
  return <h1>Admin Dashboard</h1>;
}

function StudentDashboard() {
  return <h1>Student Dashboard</h1>;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* default */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
        </Route>

        {/* student */}
        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<StudentDashboard />} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}