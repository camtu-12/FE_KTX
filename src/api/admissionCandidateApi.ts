import apiClient from "../lib/apiClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CandidateStatus = "admitted" | "enrolled" | "cancelled";
export type CandidateGender = "male" | "female";

export type EnrolledStudent = {
  id: number;
  studentCode: string;
  fullName: string;
  dateOfBirth: string | null;
  gender: CandidateGender | null;
  className: string | null;
  faculty: string | null;
  courseYear: string | null;
  currentYear: number | null;
  phone: string | null;
  email: string | null;
  schoolEmail: string | null;
  cccd: string | null;
  cccdIssuedDate: string | null;
  cccdIssuedPlace: string | null;
  nationality: string | null;
  ethnicity: string | null;
  religion: string | null;
  permanentAddress: string | null;
  fatherName: string | null;
  fatherBirthYear: string | null;
  fatherJob: string | null;
  fatherPhone: string | null;
  motherName: string | null;
  motherBirthYear: string | null;
  motherJob: string | null;
  motherPhone: string | null;
  parentAddress: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
};

export type AdmissionCandidate = {
  id: number;
  admissionCode: string;
  admissionCodeSuffix: string | null;
  expectedStudentCode: string | null;
  fullName: string;
  dateOfBirth: string;
  gender: CandidateGender | null;
  cccd: string | null;
  phone: string | null;
  email: string | null;
  permanentAddress: string | null;
  majorCode: string | null;
  majorName: string | null;
  courseYear: string | null;
  schoolYear: string | null;
  status: CandidateStatus;
  enrolledAt: string | null;
  studentId: number | null;
  student: EnrolledStudent | null;
  dormReservations?: Array<{
    id: number;
    status: string;
    convertedRegistrationId: number | null;
  }>;
  dormReservationsCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type CandidatePayload = {
  admission_code: string;
  expected_student_code?: string | null;
  full_name: string;
  date_of_birth: string;
  gender?: CandidateGender | null;
  cccd?: string | null;
  phone?: string | null;
  email?: string | null;
  permanent_address?: string | null;
  major_code?: string | null;
  major_name?: string | null;
  course_year?: string | null;
  school_year?: string | null;
  status?: CandidateStatus;
};

type ApiCandidate = {
  id: number;
  admission_code: string;
  admission_code_suffix: string | null;
  expected_student_code: string | null;
  full_name: string;
  date_of_birth: string;
  gender: CandidateGender | null;
  cccd: string | null;
  phone: string | null;
  email: string | null;
  permanent_address: string | null;
  major_code: string | null;
  major_name: string | null;
  course_year: string | null;
  school_year: string | null;
  status: CandidateStatus;
  enrolled_at: string | null;
  student_id: number | null;
  student?: {
    id: number;
    student_code: string;
    full_name: string;
    date_of_birth: string | null;
    gender: CandidateGender | null;
    class_name: string | null;
    faculty: string | null;
    course_year: string | null;
    current_year: number | null;
    phone: string | null;
    email: string | null;
    cccd: string | null;
    cccd_issued_date: string | null;
    cccd_issued_place: string | null;
    nationality: string | null;
    ethnicity: string | null;
    religion: string | null;
    permanent_address: string | null;
    father_name: string | null;
    father_birth_year: string | null;
    father_job: string | null;
    father_phone: string | null;
    mother_name: string | null;
    mother_birth_year: string | null;
    mother_job: string | null;
    mother_phone: string | null;
    parent_address: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_relationship: string | null;
  } | null;
  dorm_reservations?: Array<{
    id: number;
    status: string;
    converted_registration_id: number | null;
  }>;
  dorm_reservations_count?: number;
  created_at: string;
  updated_at: string;
};

function normalizeCandidate(c: ApiCandidate): AdmissionCandidate {
  return {
    id: c.id,
    admissionCode: c.admission_code,
    admissionCodeSuffix: c.admission_code_suffix,
    expectedStudentCode: c.expected_student_code,
    fullName: c.full_name,
    dateOfBirth: c.date_of_birth,
    gender: c.gender,
    cccd: c.cccd,
    phone: c.phone,
    email: c.email,
    permanentAddress: c.permanent_address,
    majorCode: c.major_code,
    majorName: c.major_name,
    courseYear: c.course_year,
    schoolYear: c.school_year,
    status: c.status,
    enrolledAt: c.enrolled_at,
    studentId: c.student_id,
    student: c.student
      ? {
          id: c.student.id,
          studentCode: c.student.student_code,
          fullName: c.student.full_name,
          dateOfBirth: c.student.date_of_birth,
          gender: c.student.gender,
          className: c.student.class_name,
          faculty: c.student.faculty,
          courseYear: c.student.course_year,
          currentYear: c.student.current_year,
          phone: c.student.phone,
          email: c.student.email,
          schoolEmail: c.student.email,
          cccd: c.student.cccd,
          cccdIssuedDate: c.student.cccd_issued_date,
          cccdIssuedPlace: c.student.cccd_issued_place,
          nationality: c.student.nationality,
          ethnicity: c.student.ethnicity,
          religion: c.student.religion,
          permanentAddress: c.student.permanent_address,
          fatherName: c.student.father_name,
          fatherBirthYear: c.student.father_birth_year,
          fatherJob: c.student.father_job,
          fatherPhone: c.student.father_phone,
          motherName: c.student.mother_name,
          motherBirthYear: c.student.mother_birth_year,
          motherJob: c.student.mother_job,
          motherPhone: c.student.mother_phone,
          parentAddress: c.student.parent_address,
          emergencyContactName: c.student.emergency_contact_name,
          emergencyContactPhone: c.student.emergency_contact_phone,
          emergencyContactRelationship: c.student.emergency_contact_relationship,
        }
      : null,
    dormReservations: c.dorm_reservations?.map((r) => ({
      id: r.id,
      status: r.status,
      convertedRegistrationId: r.converted_registration_id,
    })),
    dormReservationsCount: c.dorm_reservations_count,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

type PaginatedResponse<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

// ─── API functions ─────────────────────────────────────────────────────────────

export const getAdminCandidates = async (params?: {
  search?: string;
  status?: CandidateStatus | "";
  page?: number;
}): Promise<PaginatedResponse<AdmissionCandidate>> => {
  const res = await apiClient.get("/admin/admission-candidates", { params });
  const raw = res.data as PaginatedResponse<ApiCandidate>;
  return { ...raw, data: raw.data.map(normalizeCandidate) };
};

export const getAdminCandidate = async (id: number): Promise<AdmissionCandidate> => {
  const res = await apiClient.get(`/admin/admission-candidates/${id}`);
  return normalizeCandidate(res.data as ApiCandidate);
};

export const createAdminCandidate = async (payload: CandidatePayload): Promise<AdmissionCandidate> => {
  const res = await apiClient.post("/admin/admission-candidates", payload);
  return normalizeCandidate(res.data as ApiCandidate);
};

export const updateAdminCandidate = async (id: number, payload: Partial<CandidatePayload>): Promise<AdmissionCandidate> => {
  const res = await apiClient.put(`/admin/admission-candidates/${id}`, payload);
  return normalizeCandidate(res.data as ApiCandidate);
};

export const deleteAdminCandidate = async (id: number): Promise<{ message: string }> => {
  const res = await apiClient.delete(`/admin/admission-candidates/${id}`);
  return res.data as { message: string };
};

// ─── Bulk enroll ──────────────────────────────────────────────────────────────

export type BulkEnrollRowStatus = "success" | "skipped" | "error";

export type BulkEnrollRow = {
  row: number;
  student_code: string | null;
  status: BulkEnrollRowStatus;
  message: string;
};

export type BulkEnrollResult = {
  summary: { total: number; success: number; skipped: number; error: number };
  rows: BulkEnrollRow[];
};

export const downloadEnrollTemplate = async (): Promise<void> => {
  const res = await apiClient.get("/admin/admission-candidates/import-template", {
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mau_import_sinh_vien.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const bulkEnrollCandidates = async (file: File): Promise<BulkEnrollResult> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post("/admin/admission-candidates/bulk-enroll", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as BulkEnrollResult;
};
