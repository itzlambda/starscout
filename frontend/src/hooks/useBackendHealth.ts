import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { usePolling } from './usePolling';

const BASE_HEALTH_CHECK_INTERVAL = 10000; // Base interval: 10 seconds
const MAX_HEALTH_CHECK_INTERVAL = 300000; // Max interval: 5 minutes
const BACKOFF_MULTIPLIER = 2; // Double the interval on each failure

export function useBackendHealth() {
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [currentInterval, setCurrentInterval] = useState(BASE_HEALTH_CHECK_INTERVAL);
  const consecutiveFailures = useRef(0);

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

  const checkHealth = useCallback(async () => {
    try {
      const { status } = await apiClient.checkHealth();
      const isHealthy = status === 'healthy';
      
      setIsBackendHealthy(isHealthy);

      if (isHealthy) {
        // Reset interval and failure count on success
        consecutiveFailures.current = 0;
        setCurrentInterval(BASE_HEALTH_CHECK_INTERVAL);
      } else {
        // Increment failures and apply backoff
        consecutiveFailures.current += 1;
        const newInterval = Math.min(
          BASE_HEALTH_CHECK_INTERVAL * Math.pow(BACKOFF_MULTIPLIER, consecutiveFailures.current),
          MAX_HEALTH_CHECK_INTERVAL
        );
        setCurrentInterval(newInterval);
      }
    } catch (error) {
      console.error('Backend health check error:', error);
      setIsBackendHealthy(false);

      // Apply exponential backoff on network/API errors
      consecutiveFailures.current += 1;
      const newInterval = Math.min(
        BASE_HEALTH_CHECK_INTERVAL * Math.pow(BACKOFF_MULTIPLIER, consecutiveFailures.current),
        MAX_HEALTH_CHECK_INTERVAL
      );
      setCurrentInterval(newInterval);
    }
  }, []);

  // Use polling hook with optimizations
  usePolling(checkHealth, {
    enabled: isTabVisible, // Only check when tab is visible
    interval: currentInterval,
    onError: (error) => {
      console.error('Health check polling error:', error);
      setIsBackendHealthy(false);
    },
  });

  // Initial health check when component mounts
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return { 
    isBackendHealthy,
    isTabVisible,
    currentInterval: currentInterval / 1000, // Return in seconds for debugging
  };
} 