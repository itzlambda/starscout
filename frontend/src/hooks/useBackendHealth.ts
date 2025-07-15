import { useState, useEffect } from 'react';
import { useHealthCheck } from './useSwrApi';

export function useBackendHealth() {
  const [isTabVisible, setIsTabVisible] = useState(true);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      // Set initial state
      setIsTabVisible(!document.hidden);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, []);

  // Use SWR for health checking with tab visibility optimization
  const { isBackendHealthy, isLoadingHealth, healthError, recheckHealth } = useHealthCheck(isTabVisible);

  return { 
    isBackendHealthy,
    isTabVisible,
    isLoadingHealth,
    healthError,
    recheckHealth,
  };
} 