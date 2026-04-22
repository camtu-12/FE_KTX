import { loginApi, registerApi } from "../services/auth.api";
import type { LoginRequest, RegisterRequest } from "../types/auth.type";
import { setAuthStorage } from "../utils/authStorage";

export const useAuth = () => {
  const login = async (data: LoginRequest) => {
    const res = await loginApi(data);

    setAuthStorage(res.token, res.user);

    return res;
  };

  const register = async (data: RegisterRequest) => {
    return registerApi(data);
  };

  return { login, register };
};
