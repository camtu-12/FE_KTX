import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../modules/auth/store";
import { fetchMe } from "../modules/auth/services/auth.api";

type Props = {
  children: React.ReactNode;
  role?: "admin" | "student";
};

export default function ProtectedRoute({ children, role }: Props) {
  const { user, token, logout } = useAuthStore();
  // false = chưa xác minh xong với backend — chưa cho hiện nội dung trang, tránh
  // lộ giao diện dù chỉ trong tích tắc nếu role phía client bị sửa tay.
  const [verified, setVerified] = useState(false);

  // role trong localStorage do trình duyệt tự lưu, có thể bị sửa tay qua DevTools.
  // Xác minh lại với backend (nguồn dữ liệu thật) TRƯỚC khi cho hiện nội dung —
  // nếu không khớp thì đăng xuất ngay, không hiện thoáng qua rồi mới rút lại.
  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setVerified(false);

    fetchMe(token)
      .then((me: { role?: string }) => {
        if (cancelled) return;

        if (me?.role && me.role !== user?.role) {
          logout();
          return;
        }

        setVerified(true);
      })
      .catch(() => {
        // Token không hợp lệ/hết hiệu lực (đã đăng xuất, đổi mật khẩu ở nơi khác...).
        if (!cancelled) logout();
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to="/" replace />;

  if (!verified) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}