import { Navigate } from "react-router-dom";
import { getStoredAuth } from "../modules/auth/utils/authStorage";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRole?: string;
};

export default function ProtectedRoute({
  children,
  allowedRole,
}: ProtectedRouteProps) {
  const auth = getStoredAuth();
  const token = auth?.token;
  const user = auth?.user;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    const fallbackPath =
      user.role === "admin" ? "/admin/dashboard" : "/student/dashboard";
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
