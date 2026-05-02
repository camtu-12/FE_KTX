import { useAuthStore } from "../store";
import { login as loginApi, register as registerApi } from "../services/auth.api";


export const useAuth = () => {
  const login = async (data: { email: string; password: string }) => {
    const res = await loginApi(data);

    // 🔥 LƯU TOKEN
    localStorage.setItem("token", res.token);

    return res;
  };

   const register = async (data: any) => {
    const res = await registerApi(data);
    return res;
  };

  return { login, register };
};

 

