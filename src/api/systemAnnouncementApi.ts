import apiClient from "../lib/apiClient";

export type AnnouncementStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";
export type AnnouncementType = "general" | "warning" | "urgent" | "reminder" | "policy";
export type AnnouncementPriority = "normal" | "important" | "urgent";
export type AnnouncementTargetType = "active_students" | "building" | "floor" | "room" | "students";

export type SystemAnnouncementStats = {
  total: number;
  draft: number;
  scheduled: number;
  sent: number;
  failed: number;
};

export type SystemAnnouncementRecipient = {
  id: number;
  student_id: number;
  student_code: string | null;
  full_name: string | null;
  email: string | null;
  room: string | null;
  read_at: string | null;
  is_read: boolean;
  email_status: "pending" | "sent" | "failed" | "skipped";
  email_sent_at: string | null;
  email_error: string | null;
};

export type SystemAnnouncement = {
  id: number;
  title: string;
  content: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  target_type: AnnouncementTargetType;
  target_value: string | number | number[] | null;
  target_label: string;
  send_web: boolean;
  send_email: boolean;
  scheduled_at: string | null;
  sent_at: string | null;
  status: AnnouncementStatus;
  recipient_count: number;
  read_count: number;
  unread_count: number;
  email_sent_count: number;
  email_failed_count: number;
  email_pending_count: number;
  created_at: string | null;
  updated_at: string | null;
  stats?: {
    total_recipients: number;
    read: number;
    unread: number;
    email_sent: number;
    email_failed: number;
    email_pending: number;
  };
  recipients?: SystemAnnouncementRecipient[];
};

export type AnnouncementPayload = {
  title: string;
  content: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  target_type: AnnouncementTargetType;
  target_value?: string | number | number[] | null;
  send_web: boolean;
  send_email: boolean;
  attachment_path?: string | null;
  scheduled_at?: string | null;
  action?: "draft" | "send" | "schedule";
};

export type AnnouncementTargetOptions = {
  buildings: Array<{ building_code: string; name: string | null }>;
  floors: Array<{ id: number; building_code: string; floor_number: number }>;
  rooms: Array<{ id: number; building_code: string; floor_number: number; room_number: string | number }>;
};

export const listSystemAnnouncements = async (params: {
  search?: string;
  status?: AnnouncementStatus | "all";
  type?: AnnouncementType | "all";
  page?: number;
  per_page?: number;
}): Promise<{ data: SystemAnnouncement[]; meta: { current_page: number; last_page: number; per_page: number; total: number } }> => {
  const response = await apiClient.get("/admin/content/announcements", {
    params: {
      ...params,
      status: params.status === "all" ? undefined : params.status,
      type: params.type === "all" ? undefined : params.type,
    },
  });
  return response.data;
};

export const getSystemAnnouncementStats = async (): Promise<SystemAnnouncementStats> => {
  const response = await apiClient.get("/admin/content/announcements/stats");
  return response.data;
};

export const getAnnouncementTargetOptions = async (): Promise<AnnouncementTargetOptions> => {
  const response = await apiClient.get("/admin/content/announcements/target-options");
  return response.data;
};

export const getSystemAnnouncement = async (id: number): Promise<SystemAnnouncement> => {
  const response = await apiClient.get(`/admin/content/announcements/${id}`);
  return response.data;
};

export const createSystemAnnouncement = async (payload: AnnouncementPayload): Promise<SystemAnnouncement> => {
  const response = await apiClient.post("/admin/content/announcements", payload);
  return response.data;
};

export const updateSystemAnnouncement = async (id: number, payload: AnnouncementPayload): Promise<SystemAnnouncement> => {
  const response = await apiClient.put(`/admin/content/announcements/${id}`, payload);
  return response.data;
};

export const sendSystemAnnouncement = async (id: number): Promise<SystemAnnouncement> => {
  const response = await apiClient.post(`/admin/content/announcements/${id}/send`);
  return response.data;
};

export const unscheduleSystemAnnouncement = async (id: number): Promise<SystemAnnouncement> => {
  const response = await apiClient.post(`/admin/content/announcements/${id}/unschedule`);
  return response.data;
};

export const resendSystemAnnouncementEmail = async (id: number): Promise<{ queued: number }> => {
  const response = await apiClient.post(`/admin/content/announcements/${id}/resend-email`);
  return response.data;
};

export const deleteSystemAnnouncement = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/content/announcements/${id}`);
};
