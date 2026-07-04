import type { NavAutocompleteSuggestion } from "../types/navAutocomplete";
import { API } from "./registrationApi";

type FaceSearchResult = {
  student: Omit<NavAutocompleteSuggestion, "similarity">;
  similarity: number;
};

export const searchStudentsByFace = async (image: Blob): Promise<NavAutocompleteSuggestion[]> => {
  const formData = new FormData();
  formData.append("image", image, "face.jpg");

  const res = await API.post<{ results: FaceSearchResult[] }>("/admin/students/face-search", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const results = Array.isArray(res.data?.results) ? res.data.results : [];
  return results.map((item) => ({ ...item.student, similarity: item.similarity }));
};
