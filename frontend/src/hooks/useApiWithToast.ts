import { useToast } from '@/components/ui/Toast';

export function useApiWithToast() {
  const { showToast } = useToast();

  const handleMutation = async <T,>(
    mutationFn: () => Promise<T>,
    successMessage: string,
    errorMessage: string
  ): Promise<T | null> => {
    try {
      const result = await mutationFn();
      showToast(successMessage, 'success');
      return result;
    } catch (error: any) {
      const message = error?.response?.data?.detail || errorMessage;
      showToast(message, 'error');
      return null;
    }
  };

  return { handleMutation };
}
