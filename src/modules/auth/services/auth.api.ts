const API = "http://127.0.0.1:8000/api";

export const login = async (data: { email: string; password: string }) => {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (!res.ok) throw new Error(json.message);

  return json;
};

export const checkEmailExists = async (email: string) => {
  const res = await fetch(`http://127.0.0.1:8000/api/check-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email }),
  });

  return res.json();
};

export const checkStudentCodeExists = async (student_code: string) => {
  const res = await fetch("http://127.0.0.1:8000/api/check-student-code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ student_code }),
  });

  return res.json();
};

export const register = async (data: any) => {
  const res = await fetch("http://127.0.0.1:8000/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
};

