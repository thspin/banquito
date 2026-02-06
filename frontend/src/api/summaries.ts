import { apiClient } from './client';
import type {
  CreditCardSummary,
  CreditCardSummaryDetail,
  SummaryAdjustment,
  SummaryAdjustmentCreate,
  SummaryPayRequest,
  SummaryProjection,
  Transaction,
} from '@/types';

export const summariesApi = {
  getSummaries: (productId: string) =>
    apiClient.get<CreditCardSummary[]>(`/summaries/product/${productId}`),

  generateSummary: (productId: string, year: number, month: number) =>
    apiClient.post<CreditCardSummary>(`/summaries/product/${productId}?year=${year}&month=${month}`),

  getSummary: (id: string) =>
    apiClient.get<CreditCardSummaryDetail>(`/summaries/${id}`),

  closeSummary: (id: string) =>
    apiClient.post<CreditCardSummary>(`/summaries/${id}/close`),

  paySummary: (id: string, data: SummaryPayRequest) =>
    apiClient.post<Transaction>(`/summaries/${id}/pay`, data),

  resetSummary: (id: string) =>
    apiClient.post<CreditCardSummary>(`/summaries/${id}/reset`),

  addAdjustment: (summaryId: string, data: SummaryAdjustmentCreate) =>
    apiClient.post<SummaryAdjustment>(`/summaries/${summaryId}/adjustments`, data),

  deleteAdjustment: (summaryId: string, adjustmentId: string) =>
    apiClient.delete<void>(`/summaries/${summaryId}/adjustments/${adjustmentId}`),

  getProjections: (productId: string, monthsAhead?: number) =>
    apiClient.get<SummaryProjection[]>(`/summaries/product/${productId}/projections`, monthsAhead ? { months_ahead: monthsAhead } : undefined),

  getCurrentSummary: (productId: string) =>
    apiClient.get<CreditCardSummary>(`/summaries/product/${productId}/current`),
};
