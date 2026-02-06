import { apiClient } from './client';
import type { Category, CategoryCreate, CategoryUpdate } from '@/types';

export const categoriesApi = {
  getCategories: (type?: string) =>
    apiClient.get<Category[]>('/categories', type ? { category_type: type } : undefined),

  createCategory: (data: CategoryCreate) =>
    apiClient.post<Category>('/categories', data),

  updateCategory: (id: string, data: CategoryUpdate) =>
    apiClient.put<Category>(`/categories/${id}`, data),

  deleteCategory: (id: string) =>
    apiClient.delete<void>(`/categories/${id}`),

  seedCategories: () =>
    apiClient.post<{ success: boolean; message: string }>('/categories/seed'),
};
