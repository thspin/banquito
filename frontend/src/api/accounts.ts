import { apiClient } from './client';
import type {
  FinancialInstitution,
  FinancialInstitutionCreate,
  FinancialInstitutionUpdate,
  FinancialProduct,
  FinancialProductCreate,
  FinancialProductUpdate,
} from '@/types';

export const accountsApi = {
  // Institutions
  getInstitutions: () =>
    apiClient.get<FinancialInstitution[]>('/accounts/institutions'),

  createInstitution: (data: FinancialInstitutionCreate) =>
    apiClient.post<FinancialInstitution>('/accounts/institutions', data),

  updateInstitution: (id: string, data: FinancialInstitutionUpdate) =>
    apiClient.put<FinancialInstitution>(`/accounts/institutions/${id}`, data),

  deleteInstitution: (id: string) =>
    apiClient.delete<void>(`/accounts/institutions/${id}`),

  // Products
  getProducts: (institutionId?: string) =>
    apiClient.get<FinancialProduct[]>('/accounts/products', institutionId ? { institution_id: institutionId } : undefined),

  getProduct: (id: string) =>
    apiClient.get<FinancialProduct>(`/accounts/products/${id}`),

  createProduct: (data: FinancialProductCreate) =>
    apiClient.post<FinancialProduct>('/accounts/products', data),

  updateProduct: (id: string, data: FinancialProductUpdate) =>
    apiClient.put<FinancialProduct>(`/accounts/products/${id}`, data),

  deleteProduct: (id: string) =>
    apiClient.delete<void>(`/accounts/products/${id}`),
};
