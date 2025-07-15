import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

const HEALTH_CHECK_INTERVAL = 10000; // Check every 10 seconds

export function useBackendHealth() {
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const { status } = await apiClient.checkHealth();
        setIsBackendHealthy(status === 'healthy');
      } catch (error) {
        console.error('Backend health check error:', error);
        setIsBackendHealthy(false);
      }
    };

    // Check health immediately
    checkHealth();

    // Set up periodic health checks
    const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);

    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, []);

  return { isBackendHealthy };
} 