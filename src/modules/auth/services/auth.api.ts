import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from "../types/auth.type";

type MockUser = {
  id: number;
  studentCode: string;
  email: string;
  password: string;
  role: "admin" | "student";
};

const mockUsers: MockUser[] = [
  {
    id: 1,
    studentCode: "ADMIN001",
    email: "admin@gmail.com",
    password: "123",
    role: "admin",
  },
  {
    id: 2,
    studentCode: "SV001",
    email: "student@gmail.com",
    password: "123",
    role: "student",
  },
];

export const loginApi = async (data: LoginRequest): Promise<LoginResponse> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const normalizedEmail = data.email.trim().toLowerCase();

      const foundUser = mockUsers.find(
        (user) => user.email === normalizedEmail && user.password === data.password
      );

      if (foundUser) {
        resolve({
          token: `fake_token_${foundUser.role}_${foundUser.id}`,
          user: {
            id: foundUser.id,
            email: foundUser.email,
            role: foundUser.role,
          },
        });
      } else {
        reject(new Error("Tài khoản hoặc mật khẩu không đúng"));
      }
    }, 900);
  });
};

export const registerApi = async (
  data: RegisterRequest
): Promise<RegisterResponse> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const normalizedEmail = data.email.trim().toLowerCase();
      const normalizedStudentCode = data.studentCode.trim().toUpperCase();

      const existedUser = mockUsers.find(
        (user) =>
          user.email === normalizedEmail ||
          user.studentCode === normalizedStudentCode
      );

      if (existedUser) {
        reject(new Error("Email hoặc MSSV đã tồn tại trong hệ thống"));
        return;
      }

      const newUser: MockUser = {
        id: mockUsers.length + 1,
        studentCode: normalizedStudentCode,
        email: normalizedEmail,
        password: data.password,
        role: "student",
      };

      mockUsers.push(newUser);

      resolve({
        message: "Đăng ký thành công",
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
        },
      });
    }, 1100);
  });
};
