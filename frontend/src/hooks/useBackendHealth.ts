import { useState, useEffect } from 'react';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
const HEALTH_CHECK_INTERVAL = 10000; // Check every 10 seconds

export function useBackendHealth() {
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${BACKEND_API_URL}/`);
        if (!response.ok) {
          throw new Error('Backend health check failed');
        }
        const data = await response.json();
        setIsBackendHealthy(data.status === 'healthy');
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