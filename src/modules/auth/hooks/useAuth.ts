import { loginApi, registerApi } from "../services/auth.api";
import type { LoginRequest, RegisterRequest } from "../types/auth.type";

export const useAuth = () => {
  const login = async (data: LoginRequest) => {
    const res = await loginApi(data);

    localStorage.setItem("token", res.token);
    localStorage.setItem("user", JSON.stringify(res.user));

    return res;
  };

  const register = async (data: RegisterRequest) => {
    return registerApi(data);
  };

  return { login, register };
};
