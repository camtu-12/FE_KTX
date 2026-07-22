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

export type StaticPage = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
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
  content: string;
  image?: File | null;
};

export async function updateStaticPage(slug: string, payload: StaticPagePayload): Promise<StaticPage> {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("summary", payload.summary ?? "");
  form.append("content", payload.content);
  if (payload.image) {
    form.append("image", payload.image);
  }
  const { data } = await apiClient.post<StaticPage>(`/admin/pages/${slug}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
