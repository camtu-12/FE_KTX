import { useAuthStore } from "../store";
import type { LoginRequest, RegisterRequest } from "../types/auth.type";
import { login as loginApi, register as registerApi } from "../services/auth.api";

export const useAuth = () => {
  const { setAuth } = useAuthStore();

  const login = async (data: LoginRequest) => {
    const res = await loginApi(data);
    // Lưu token + user vào kho trạng thái
    setAuth(res.user, res.token);
    return res;
  };

  const register = async (data: RegisterRequest) => {
    const res = await registerApi(data);
    return res;
  };

  return { login, register };
};