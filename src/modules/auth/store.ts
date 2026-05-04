import { create } from "zustand";

type User = {
  id: number;
  email: string;
  role: "admin" | "student";
};

type AuthState = {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
};

// 🔥 lấy từ localStorage khi reload
const storedUser = localStorage.getItem("user");
const storedToken = localStorage.getItem("token");

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken,

  setAuth: (user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user)); 
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user"); 
    set({ user: null, token: null });
  },
}));