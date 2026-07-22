import { create } from "zustand";
import type { AuthUser } from "./types/auth.type";
import { clearAuthStorage, getStoredAuth, setAuthStorage } from "./utils/authStorage";

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
};

const storedAuth = getStoredAuth();

export const useAuthStore = create<AuthState>((set) => ({
  user: storedAuth?.user ?? null,
  token: storedAuth?.token ?? null,

  setAuth: (user, token) => {
    setAuthStorage(token, user);
    set({ user, token });
  },

  logout: () => {
    clearAuthStorage();
    set({ user: null, token: null });
  },
}));