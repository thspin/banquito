import { apiClient } from './client';
import type {
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  TransferCreate,
} from '@/types';

export const transactionsApi = {
  getTransactions: (params?: { product_id?: string; category_id?: string; transaction_type?: string }) =>
    apiClient.get<Transaction[]>('/transactions', params),

  createTransaction: (data: TransactionCreate) =>
    apiClient.post<Transaction[]>('/transactions', data),

  updateTransaction: (id: string, data: TransactionUpdate) =>
    apiClient.put<Transaction>(`/transactions/${id}`, data),

  deleteTransaction: (id: string) =>
    apiClient.delete<void>(`/transactions/${id}`),

  createTransfer: (data: TransferCreate) =>
    apiClient.post<Transaction>('/transactions/transfers', data),
};
