import apiClient from "../lib/apiClient";

export type FeeDiscountPolicy = {
  priorityCriteriaId: number;
  code: string;
  name: string;
  tier: number;
  priorityScore: number;
  discountPercent: number;
  isActive: boolean;
};

type ApiFeeDiscountPolicy = {
  priority_criteria_id: number;
  code: string;
  name: string;
  tier: number;
  priority_score: number;
  discount_percent: number;
  is_active: boolean;
};

const normalize = (item: ApiFeeDiscountPolicy): FeeDiscountPolicy => ({
  priorityCriteriaId: item.priority_criteria_id,
  code: item.code,
  name: item.name,
  tier: item.tier,
  priorityScore: item.priority_score,
  discountPercent: Number(item.discount_percent) || 0,
  isActive: item.is_active,
});

export const getFeeDiscountPolicies = async (): Promise<FeeDiscountPolicy[]> => {
  const response = await apiClient.get<ApiFeeDiscountPolicy[]>("/fee-discount-policies");
  return response.data.map(normalize);
};

export const updateFeeDiscountPolicy = async (
  priorityCriteriaId: number,
  payload: { discount_percent: number; is_active: boolean },
): Promise<FeeDiscountPolicy> => {
  const response = await apiClient.put<ApiFeeDiscountPolicy>(
    `/fee-discount-policies/${priorityCriteriaId}`,
    payload,
  );
  return normalize(response.data);
};

export const createPriorityCriteria = async (payload: {
  code: string;
  name: string;
  tier: number;
  priority_score: number;
  discount_percent?: number;
  is_active?: boolean;
}): Promise<FeeDiscountPolicy> => {
  const response = await apiClient.post<ApiFeeDiscountPolicy>("/fee-discount-policies", payload);
  return normalize(response.data);
};

export const deletePriorityCriteria = async (priorityCriteriaId: number): Promise<void> => {
  await apiClient.delete(`/fee-discount-policies/${priorityCriteriaId}`);
};
