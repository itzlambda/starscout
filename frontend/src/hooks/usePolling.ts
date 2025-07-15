import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  enabled: boolean;
  interval: number;
  onError?: (error: Error) => void;
}

export function usePolling(
  callback: () => void | Promise<void>,
  options: UsePollingOptions
) {
  const { enabled, interval, onError } = options;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  callbackRef.current = callback;

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      try {
        await callbackRef.current();
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Polling callback failed');
        console.error('Error in polling callback:', err);
        onError?.(err);
      }
    }, interval);
  }, [interval, onError]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start/stop polling based on enabled state
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    // Cleanup on unmount or when dependencies change
    return stopPolling;
  }, [enabled, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    startPolling,
    stopPolling,
    isPolling: intervalRef.current !== null,
  };
} 