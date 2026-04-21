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
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type RegisterResponse = {
  message: string;
  user: AuthUser;
};
