import { useCallback } from 'react';

const INITIALIZATION_KEY = 'starscout_user_initialization_attempted';

export function useInitialization() {
  const hasInitializationBeenAttempted = useCallback((): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      return window.sessionStorage.getItem(INITIALIZATION_KEY) === 'true';
    } catch (error) {
      console.warn('Error reading initialization state:', error);
      return false;
    }
  }, []);

  const markInitializationAttempted = useCallback((): void => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(INITIALIZATION_KEY, 'true');
      }
    } catch (error) {
      console.warn('Error setting initialization state:', error);
    }
  }, []);

  const resetInitializationState = useCallback((): void => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(INITIALIZATION_KEY);
      }
    } catch (error) {
      console.warn('Error resetting initialization state:', error);
    }
  }, []);

  return {
    hasInitializationBeenAttempted,
    markInitializationAttempted,
    resetInitializationState,
  };
} 