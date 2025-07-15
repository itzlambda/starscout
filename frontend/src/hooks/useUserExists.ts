import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

export function useUserExists() {
  const checkUserExists = useCallback(async (accessToken: string): Promise<boolean> => {
    if (!accessToken) return false;

    try {
      const data = await apiClient.checkUserExists(accessToken);
      return Boolean(data.user_exists);
    } catch (error) {
      console.error('Error checking if user exists:', error);
      return false;
    }
  }, []);

  return { checkUserExists };
} 