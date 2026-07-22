import apiClient from "../lib/apiClient";

export type NotificationItem = {
  recipient_id: number;
  id: number;
  title: string;
  content: string;
  type: string;
  related_id: number | null;
  target_type: string | null;
  created_at: string;
  is_read: boolean | number;
  read_at: string | null;
};

export type StudentSystemAnnouncementDetail = {
  id: number;
  title: string;
  content: string;
  type: string;
  priority: string | null;
  sent_at: string | null;
  scheduled_at: string | null;
  created_at: string | null;
  attachment_path: string | null;
  attachment_url: string | null;
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

export const getMyNotifications = (limit = 20): Promise<NotificationItem[]> =>
  apiClient.get("/student/notifications", { params: { limit } }).then(
    (res) => (Array.isArray(res.data) ? (res.data as NotificationItem[]) : []),
  );

export const getUnreadCount = (): Promise<number> =>
  apiClient.get("/student/notifications/unread-count").then(
    (res) => ((res.data as { count: number }).count ?? 0),
  );

export const markNotificationRead = (recipientId: number): Promise<void> =>
  apiClient.put(`/student/notifications/${recipientId}/read`).then(() => {});

export const markAllNotificationsRead = (): Promise<void> =>
  apiClient.put("/student/notifications/read-all").then(() => {});

export const getStudentSystemAnnouncement = (id: number): Promise<StudentSystemAnnouncementDetail> =>
  apiClient.get(`/student/notifications/system-announcements/${id}`).then((res) => res.data as StudentSystemAnnouncementDetail);

const systemAnnouncementTypes = ["general", "warning", "urgent", "reminder", "policy"];
const systemAnnouncementTargets = ["active_students", "building", "floor", "room", "students"];

export const isSystemAnnouncementNotification = (item: Pick<NotificationItem, "type" | "related_id" | "target_type">): boolean =>
  Boolean(item.related_id) && systemAnnouncementTypes.includes(item.type) && systemAnnouncementTargets.includes(item.target_type ?? "");

// ── Admin notifications ──

export const getAdminNotifications = (limit = 30): Promise<AdminNotificationItem[]> =>
  apiClient.get("/admin/notifications", { params: { limit } }).then(
    (res) => (Array.isArray(res.data) ? (res.data as AdminNotificationItem[]) : []),
  );

export const getAdminUnreadCount = (): Promise<number> =>
  apiClient.get("/admin/notifications/unread-count").then(
    (res) => ((res.data as { count: number }).count ?? 0),
  );

export const markAdminNotificationRead = (id: number): Promise<void> =>
  apiClient.put(`/admin/notifications/${id}/read`).then(() => {});

export const markAllAdminNotificationsRead = (): Promise<void> =>
  apiClient.put("/admin/notifications/read-all").then(() => {});
