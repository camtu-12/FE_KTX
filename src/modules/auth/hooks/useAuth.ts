import { useAuthStore } from "../store";
import { login as loginApi, register as registerApi } from "../services/auth.api";

type RegisterRequest = {
  full_name: string;
  student_code: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export const useAuth = () => {
  const { setAuth } = useAuthStore();

  const login = async (data: { email: string; password: string }) => {
    const res = await loginApi(data);
    // Lưu token + user vào store
    setAuth(res.user, res.token);
    return res;
  };

  const register = async (data: RegisterRequest) => {
    const res = await registerApi(data);
    return res;
  };

  return { login, register };
};