import apiClient from "../lib/apiClient";

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
};

export type ChangePasswordResponse = {
  message: string;
};

export async function changePassword(payload: ChangePasswordPayload): Promise<ChangePasswordResponse> {
  const { data } = await apiClient.post<ChangePasswordResponse>("/change-password", payload);
  return data;
}
