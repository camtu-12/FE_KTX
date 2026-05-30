import type { LoginRequest, RegisterRequest } from "../types/auth.type";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

type ValidationErrors = Record<string, string[]>;

type ApiErrorBody = {
  message?: string;
  errors?: ValidationErrors;
};

const getFirstValidationMessage = (errors?: ValidationErrors): string | undefined => {
  if (!errors) return undefined;

  for (const messages of Object.values(errors)) {
    if (Array.isArray(messages) && messages.length > 0 && messages[0]) {
      return messages[0];
    }
  }

  return undefined;
};

const flattenValidationErrors = (errors?: ValidationErrors): Record<string, string> => {
  if (!errors) return {};

  const flattened: Record<string, string> = {};

  for (const [field, messages] of Object.entries(errors)) {
    if (Array.isArray(messages) && messages.length > 0 && messages[0]) {
      flattened[field] = messages[0];
    }
  }

  return flattened;
};

export class ApiHttpError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const parseErrorBody = async (res: Response): Promise<ApiErrorBody> => {
  try {
    return (await res.json()) as ApiErrorBody;
  } catch {
    return {};
  }
};

const ensureOk = async (res: Response, fallbackMessage: string) => {
  if (res.ok) {
    return;
  }

  const body = await parseErrorBody(res);
  const fieldErrors = flattenValidationErrors(body.errors);
  const message = body.message ?? getFirstValidationMessage(body.errors) ?? fallbackMessage;

  throw new ApiHttpError(message, res.status, fieldErrors);
};

export const login = async (data: LoginRequest) => {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  await ensureOk(res, "Đăng nhập thất bại.");
  const json = await res.json();

  return json;
};

export const checkEmailExists = async (email: string) => {
  const res = await fetch(`${API}/check-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email }),
  });

  return res.json();
};

export const checkStudentCodeExists = async (student_code: string) => {
  const res = await fetch(`${API}/check-student-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ student_code }),
  });

  return res.json();
};

export const register = async (data: RegisterRequest) => {
  const res = await fetch(`${API}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  await ensureOk(res, "Đăng ký thất bại.");
  const json = await res.json();

  return json;
};

export const forgotPassword = async (email: string) => {
  const res = await fetch(`${API}/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  return res.json();
};

export const sendOtp = async (data: { email: string }) => {
  const res = await fetch(`${API}/send-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  await ensureOk(res, "Gửi OTP thất bại.");
  const json = await res.json();

  return json;
};

export const resetPasswordOtp = async (data: {
  email: string;
  otp: string;
  password: string;
  password_confirmation?: string;
}) => {
  const payload = {
    ...data,
    password_confirmation: data.password_confirmation ?? data.password,
  };

  const res = await fetch(`${API}/reset-password-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  await ensureOk(res, "Đổi mật khẩu thất bại.");
  const json = await res.json();

  return json;
};