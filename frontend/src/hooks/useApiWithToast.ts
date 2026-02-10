import { useToast } from '@/components/ui/Toast';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  detail?: string;
  message?: string;
}

interface MutationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onFinally?: () => void;
}

export function useApiWithToast() {
  const { showToast } = useToast();

  /**
   * Extract error message from API error
   */
  const extractErrorMessage = (error: unknown): string => {
    if (error instanceof AxiosError) {
      const data = error.response?.data as ApiErrorResponse | undefined;
      return data?.detail || data?.message || error.message;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred';
  };

  /**
   * Handle mutation with toast notifications
   */
  const handleMutation = async <T,>(
    mutationFn: () => Promise<T>,
    successMessage: string,
    errorMessage: string,
    options?: MutationOptions<T>
  ): Promise<T | null> => {
    try {
      const result = await mutationFn();
      showToast(successMessage, 'success');
      options?.onSuccess?.(result);
      return result;
    } catch (error: unknown) {
      const message = extractErrorMessage(error);
      showToast(message || errorMessage, 'error');
      
      if (error instanceof Error) {
        options?.onError?.(error);
      }
      
      return null;
    } finally {
      options?.onFinally?.();
    }
  };

  /**
   * Handle query with error toast only
   */
  const handleQuery = async <T,>(
    queryFn: () => Promise<T>,
    errorMessage: string,
    options?: MutationOptions<T>
  ): Promise<T | null> => {
    try {
      const result = await queryFn();
      options?.onSuccess?.(result);
      return result;
    } catch (error: unknown) {
      const message = extractErrorMessage(error);
      showToast(message || errorMessage, 'error');
      
      if (error instanceof Error) {
        options?.onError?.(error);
      }
      
      return null;
    } finally {
      options?.onFinally?.();
    }
  };

  /**
   * Handle batch mutations
   */
  const handleBatchMutation = async <T,>(
    mutations: Array<{
      fn: () => Promise<T>;
      successMsg: string;
      errorMsg: string;
    }>,
    completeMessage?: string
  ): Promise<T[]> => {
    const results: T[] = [];
    const errors: string[] = [];

    for (const mutation of mutations) {
      try {
        const result = await mutation.fn();
        results.push(result);
        showToast(mutation.successMsg, 'success');
      } catch (error: unknown) {
        const message = extractErrorMessage(error);
        errors.push(message);
        showToast(`${mutation.errorMsg}: ${message}`, 'error');
      }
    }

    if (errors.length === 0 && completeMessage) {
      showToast(completeMessage, 'success');
    } else if (errors.length > 0 && mutations.length > 1) {
      showToast(
        `Completed ${results.length}/${mutations.length} operations`,
        errors.length === mutations.length ? 'error' : 'info'
      );
    }

    return results;
  };

  return { 
    handleMutation, 
    handleQuery, 
    handleBatchMutation,
    extractErrorMessage 
  };
}
