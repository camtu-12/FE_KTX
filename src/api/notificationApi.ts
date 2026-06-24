import { API } from "./registrationApi";

export type NotificationItem = {
  recipient_id: number;
  id: number;
  title: string;
  content: string;
  type: string;
  related_id: number | null;
  created_at: string;
  is_read: boolean | number;
  read_at: string | null;
};

export type AdminNotificationItem = {
  id: number;
  title: string;
  content: string;
  type: string;
  related_id: number | null;
  created_at: string;
  is_read: boolean | number;
  read_at: string | null;
};

// ── Student notifications ──

export const getMyNotifications = (email: string, limit = 20): Promise<NotificationItem[]> =>
  API.get("/student/notifications", { params: { email, limit } }).then(
    (res) => (Array.isArray(res.data) ? (res.data as NotificationItem[]) : []),
  );

export const getUnreadCount = (email: string): Promise<number> =>
  API.get("/student/notifications/unread-count", { params: { email } }).then(
    (res) => ((res.data as { count: number }).count ?? 0),
  );

export const markNotificationRead = (recipientId: number, email: string): Promise<void> =>
  API.put(`/student/notifications/${recipientId}/read`, {}, { params: { email } }).then(() => {});

export const markAllNotificationsRead = (email: string): Promise<void> =>
  API.put("/student/notifications/read-all", {}, { params: { email } }).then(() => {});

// ── Admin notifications ──

export const getAdminNotifications = (limit = 30): Promise<AdminNotificationItem[]> =>
  API.get("/admin/notifications", { params: { limit } }).then(
    (res) => (Array.isArray(res.data) ? (res.data as AdminNotificationItem[]) : []),
  );

export const getAdminUnreadCount = (): Promise<number> =>
  API.get("/admin/notifications/unread-count").then(
    (res) => ((res.data as { count: number }).count ?? 0),
  );

export const markAdminNotificationRead = (id: number): Promise<void> =>
  API.put(`/admin/notifications/${id}/read`).then(() => {});

export const markAllAdminNotificationsRead = (): Promise<void> =>
  API.put("/admin/notifications/read-all").then(() => {});
