export type AuthUser = {
  id: number;
  email: string;
  role: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  studentCode: string;
  fullName: string;
  gender: "male" | "female";
  className: string;
  faculty: string;
  phone: string;
  email: string;
  cccd: string;
  permanentAddress: string;
  password: string;
  parentName: string;
  parentPhone: string;
  parentRelationship: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type RegisterResponse = {
  message: string;
  user: AuthUser;
};
