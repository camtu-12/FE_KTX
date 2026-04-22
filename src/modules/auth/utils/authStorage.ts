import type { AuthUser } from "../types/auth.type";

const TOKEN_KEY = "token";
const USER_KEY = "user";

type StoredAuth = {
  token: string;
  user: AuthUser;
};

function isValidUser(user: unknown): user is AuthUser {
  if (!user || typeof user !== "object") {
    return false;
  }

  const candidate = user as Partial<AuthUser>;
  return (
    typeof candidate.id === "number" &&
    typeof candidate.email === "string" &&
    typeof candidate.role === "string"
  );
}

export function clearAuthStorage() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function setAuthStorage(token: string, user: AuthUser) {
  clearAuthStorage();
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredAuth(): StoredAuth | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const rawUser = sessionStorage.getItem(USER_KEY);

  if (!token || !rawUser) {
    return null;
  }

  try {
    const user = JSON.parse(rawUser);

    if (!isValidUser(user)) {
      clearAuthStorage();
      return null;
    }

    return { token, user };
  } catch {
    clearAuthStorage();
    return null;
  }
}
