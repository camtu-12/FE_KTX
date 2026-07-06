import apiClient from "../lib/apiClient";

export type StudentSearchResult = {
  id: number;
  full_name: string;
  student_code: string;
  avatar_url: string | null;
  room_number: string | null;
  building_code: string | null;
  faculty: string | null;
  current_year: number | null;
  occupancy_status: string | null;
  occupancy_id: number | null;
  registration_id: number | null;
};

export const searchStudentsForOccupancy = async (
  q: string,
  limit = 8,
): Promise<StudentSearchResult[]> => {
  const res = await apiClient.get<StudentSearchResult[]>("/admin/students/search", {
    params: { q, limit },
  });
  return Array.isArray(res.data) ? res.data : [];
};
