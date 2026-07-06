import apiClient from "../lib/apiClient";

export type StudentProfileInfo = {
  id: number;
  student_code: string | null;
  full_name: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  class_name: string | null;
  faculty: string | null;
  course_year: string | null;
  phone: string | null;
  cccd: string | null;
  cccd_issued_date: string | null;
  cccd_issued_place: string | null;
  nationality: string | null;
  ethnicity: string | null;
  religion: string | null;
  permanent_address: string | null;
  province_code: string | null;
  province_name: string | null;
  avatar_url: string | null;
  status: string | null;
  academic_status: string | null;
  current_year: number | null;
};

export type StudentProfileFamily = {
  father_name: string | null;
  father_birth_year: string | null;
  father_job: string | null;
  father_phone: string | null;
  mother_name: string | null;
  mother_birth_year: string | null;
  mother_job: string | null;
  mother_phone: string | null;
  parent_address: string | null;
};

export type StudentProfileResidence = {
  building_code: string | null;
  floor_number: number | null;
  room_number: string | null;
  bed_number: string | null;
  status: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
} | null;

export type StudentProfileDocuments = {
  cccd_front_url: string | null;
  cccd_back_url: string | null;
};

export type StudentProfilePriorityCriteria = {
  id: number;
  criteria_id: number | null;
  code: string | null;
  name: string | null;
  evidence_urls: string[];
  status: string | null;
};

export type StudentProfileBlacklist = {
  reason: string | null;
  source: string | null;
  created_at: string | null;
} | null;

export type StudentProfileData = {
  student: StudentProfileInfo;
  family: StudentProfileFamily;
  residence: StudentProfileResidence;
  documents: StudentProfileDocuments;
  priority_criteria: StudentProfilePriorityCriteria[];
  blacklist: StudentProfileBlacklist;
};

export async function fetchStudentProfile(): Promise<StudentProfileData> {
  const { data } = await apiClient.get<StudentProfileData>("/student/profile");
  return data;
}
