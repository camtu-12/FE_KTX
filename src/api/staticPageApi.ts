import axios from "axios";
import apiClient from "../lib/apiClient";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const API_ROOT = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

const http = axios.create({ baseURL: API_ROOT });

export type PageStat = {
  label: string;
  value: string;
  unit: string;
};

export type PageItemIcon =
  | "BadgeCheck" | "FileText" | "ClipboardCheck" | "CreditCard" | "Home" | "Utensils" | "Car"
  | "BookOpen" | "Users" | "Camera" | "Flame" | "ShieldCheck" | "Wifi" | "Droplets" | "Building2"
  | "BedDouble" | "AlarmClock" | "PhoneCall";

// Danh sách icon được phép chọn — phải khớp đúng StaticPageController::ALLOWED_ITEM_ICONS bên BE.
export const ALLOWED_PAGE_ITEM_ICONS: PageItemIcon[] = [
  "BadgeCheck", "FileText", "ClipboardCheck", "CreditCard", "Home", "Utensils", "Car",
  "BookOpen", "Users", "Camera", "Flame", "ShieldCheck", "Wifi", "Droplets", "Building2",
  "BedDouble", "AlarmClock", "PhoneCall",
];

export type PageItem = {
  icon: PageItemIcon;
  title: string;
  description: string;
  detail_path: string | null;
};

// Nhóm thẻ lớn có checklist (dùng cho "điều kiện", "bước quy trình", "nhóm hồ sơ"...)
export type PageGroup = {
  icon: PageItemIcon;
  title: string;
  description: string | null;
  items: string[];
};

// Bước nhỏ dạng số thứ tự ngang (chỉ icon + tiêu đề, không mô tả/checklist)
export type PageStep = {
  icon: PageItemIcon;
  title: string;
};

// Mục cảnh báo/nổi bật dạng thẻ nhỏ (chỉ icon + 1 dòng chữ)
export type PageHighlight = {
  icon: PageItemIcon;
  label: string;
};

export type PageSections = {
  hero_icon: PageItemIcon;
  groups: PageGroup[];
  steps: PageStep[];
  highlights_title: string | null;
  highlights: PageHighlight[];
  notes_title: string | null;
  notes: string[];
};

export type StaticPage = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  items: PageItem[];
  sections: PageSections | null;
  stats: PageStat[];
  images: string[];
  updated_at: string;
};

export async function fetchStaticPage(slug: string): Promise<StaticPage> {
  const { data } = await http.get<StaticPage>(`/pages/${slug}`);
  return data;
}

export type StaticPagePayload = {
  title: string;
  summary?: string;
  content?: string;
  items?: PageItem[];
  sections?: PageSections;
  image?: File | null;
};

export async function updateStaticPage(slug: string, payload: StaticPagePayload): Promise<StaticPage> {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("summary", payload.summary ?? "");
  form.append("content", payload.content ?? "");
  if (payload.items) {
    form.append("items", JSON.stringify(payload.items));
  }
  if (payload.sections) {
    form.append("sections", JSON.stringify(payload.sections));
  }
  if (payload.image) {
    form.append("image", payload.image);
  }
  const { data } = await apiClient.post<StaticPage>(`/admin/pages/${slug}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
