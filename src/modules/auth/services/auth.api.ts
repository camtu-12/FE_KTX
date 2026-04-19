import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from "../types/auth.type";

const mockUsers = [
  {
    id: 1,
    studentCode: "ADMIN001",
    fullName: "Quản trị viên",
    gender: "male",
    className: "QTHT",
    faculty: "Ban quản lý",
    phone: "0900000001",
    email: "admin@gmail.com",
    username: "admin",
    cccd: "001099000001",
    permanentAddress: "TP. Hồ Chí Minh",
    password: "123",
    parentName: "Nguyễn Văn B",
    parentPhone: "0900000009",
    parentRelationship: "Phụ huynh",
    role: "admin",
  },
  {
    id: 2,
    studentCode: "SV001",
    fullName: "Sinh viên 001",
    gender: "female",
    className: "D21_TH01",
    faculty: "Công nghệ thông tin",
    phone: "0900000002",
    email: "student@gmail.com",
    username: "sv001",
    cccd: "001099000002",
    permanentAddress: "Đà Nẵng",
    password: "123",
    parentName: "Trần Văn C",
    parentPhone: "0900000008",
    parentRelationship: "Cha",
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
          user.studentCode === normalizedStudentCode ||
          user.phone === data.phone.trim() ||
          user.cccd === data.cccd.trim()
      );

      if (existedUser) {
        reject(
          new Error("Email, MSSV, CCCD hoặc số điện thoại đã tồn tại trong hệ thống")
        );
        return;
      }

      const newUser = {
        id: mockUsers.length + 1,
        studentCode: normalizedStudentCode,
        fullName: data.fullName.trim(),
        gender: data.gender,
        className: data.className.trim(),
        faculty: data.faculty.trim(),
        phone: data.phone.trim(),
        email: normalizedEmail,
        username: normalizedStudentCode.toLowerCase(),
        cccd: data.cccd.trim(),
        permanentAddress: data.permanentAddress.trim(),
        password: data.password,
        parentName: data.parentName.trim(),
        parentPhone: data.parentPhone.trim(),
        parentRelationship: data.parentRelationship.trim(),
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
