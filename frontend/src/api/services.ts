import { apiClient } from './client';
import type {
  Service,
  ServiceCreate,
  ServiceUpdate,
  ServiceBill,
  ServiceBillCreate,
  ServiceBillUpdate,
  ServiceBillPayRequest,
  Transaction,
} from '@/types';

export const servicesApi = {
  // Services
  getServices: () =>
    apiClient.get<Service[]>('/services'),

  createService: (data: ServiceCreate) =>
    apiClient.post<Service>('/services', data),

  updateService: (id: string, data: ServiceUpdate) =>
    apiClient.put<Service>(`/services/${id}`, data),

  deleteService: (id: string) =>
    apiClient.delete<void>(`/services/${id}`),

  // Bills
  getBills: (params?: { year?: number; month?: number; status?: string }) =>
    apiClient.get<ServiceBill[]>('/services/bills', params),

  getMonthlyBills: (year: number, month: number) =>
    apiClient.get<ServiceBill[]>(`/services/bills/monthly/${year}/${month}`),

  createBill: (data: ServiceBillCreate) =>
    apiClient.post<ServiceBill>('/services/bills', data),

  updateBill: (id: string, data: ServiceBillUpdate) =>
    apiClient.put<ServiceBill>(`/services/bills/${id}`, data),

  payBill: (id: string, data: ServiceBillPayRequest) =>
    apiClient.post<Transaction>(`/services/bills/${id}/pay`, data),

  skipBill: (id: string) =>
    apiClient.post<ServiceBill>(`/services/bills/${id}/skip`),

  deleteBill: (id: string) =>
    apiClient.delete<void>(`/services/bills/${id}`),
};
