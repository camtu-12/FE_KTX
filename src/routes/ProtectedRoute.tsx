import { Navigate } from "react-router-dom";
import { useAuthStore } from "../modules/auth/store";

type Props = {
  children: React.ReactNode;
  role?: "admin" | "student";
};

export default function ProtectedRoute({ children, role }: Props) {
  const { user, token } = useAuthStore();

  if (!token) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to="/" replace />;

  return <>{children}</>;
}