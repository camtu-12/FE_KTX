import { Navigate } from "react-router-dom";
import { useAuthStore } from "../modules/auth/store"; // chỉnh path cho đúng

type Props = {
  children: React.ReactNode;
  role?: "admin" | "student"; // 🔥 optional role
};

export default function ProtectedRoute({ children, role }: Props) {
  const { user, token } = useAuthStore();

  // ❌ chưa login
  if (!token) {
    return <Navigate to="/login" />;
  }

  // ❌ có role yêu cầu nhưng user không đúng role
  if (role && user?.role !== role) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}