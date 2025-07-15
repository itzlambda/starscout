import { useState, useCallback, useEffect } from 'react';
import type { RateLimitError } from '@/types/github';

interface UseRateLimitReturn {
  rateLimitError: RateLimitError | null;
  setRateLimitError: (error: RateLimitError | null) => void;
  clearRateLimit: () => void;
  isRateLimited: boolean;
  remainingTime: number; // seconds until retry is allowed
  handleRateLimitInfo: (rateLimitInfo: {
    isRateLimited: boolean;
    retryAfter?: number;
    limit?: number;
    remaining?: number;
  }, customMessage?: string) => boolean;
}

export function useRateLimit(): UseRateLimitReturn {
  const [rateLimitError, setRateLimitError] = useState<RateLimitError | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);

  // Countdown effect for rate limit retry timer
  useEffect(() => {
    if (!rateLimitError?.retryAfter) {
      setRemainingTime(0);
      return;
    }

    const targetTime = Date.now() + (rateLimitError.retryAfter * 1000);
    
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((targetTime - now) / 1000));
      
      setRemainingTime(remaining);
      
      // Auto-clear rate limit when countdown reaches 0
      if (remaining === 0 && rateLimitError) {
        setRateLimitError(null);
      }
    };

    // Update immediately
    updateCountdown();

    // Set up interval to update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [rateLimitError?.retryAfter, rateLimitError]);

  const clearRateLimit = useCallback(() => {
    setRateLimitError(null);
    setRemainingTime(0);
  }, []);

  const handleRateLimitInfo = useCallback((rateLimitInfo: {
    isRateLimited: boolean;
    retryAfter?: number;
    limit?: number;
    remaining?: number;
  }, customMessage?: string) => {
    if (rateLimitInfo.isRateLimited) {
      setRateLimitError({
        isRateLimited: true,
        retryAfter: rateLimitInfo.retryAfter,
        limit: rateLimitInfo.limit,
        remaining: rateLimitInfo.remaining,
        message: customMessage || "You've exceeded the rate limit. Please wait before trying again.",
      });
      return true; // Indicates rate limit was triggered
    }
    return false; // No rate limit
  }, []);

  const enhancedSetRateLimitError = useCallback((error: RateLimitError | null) => {
    setRateLimitError(error);
    if (!error) {
      setRemainingTime(0);
    }
  }, []);

  return {
    rateLimitError,
    setRateLimitError: enhancedSetRateLimitError,
    clearRateLimit,
    isRateLimited: !!rateLimitError?.isRateLimited,
    remainingTime,
    handleRateLimitInfo,
  };
} 