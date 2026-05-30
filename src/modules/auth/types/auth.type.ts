export type AuthUser = {
  id: number;
  email: string;
  role: string;
  student_id?: number | null;
  studentCode?: string | null;
  student_code?: string | null;
  fullName?: string | null;
  full_name?: string | null;
};

export type LoginRequest = {
  email?: string;
  student_code?: string;
  password: string;
};

export type RegisterRequest = {
  student_code: string;
  password: string;
  password_confirmation: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type RegisterResponse = {
  message: string;
  user: AuthUser;
};
