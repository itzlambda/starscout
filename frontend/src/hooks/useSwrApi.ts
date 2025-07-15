import useSWR from 'swr';
import { apiFetcher, SWR_KEYS } from '@/lib/swr-config';

/**
 * Hook for fetching app settings with caching
 * Cache duration: 10 minutes (settings rarely change)
 */
export function useSettings() {
  const { data, error, isLoading, mutate } = useSWR(
    SWR_KEYS.SETTINGS,
    apiFetcher.settings,
    {
      // Cache for 10 minutes
      refreshInterval: 10 * 60 * 1000,
      // Don't refetch on focus since settings rarely change
      revalidateOnFocus: false,
    }
  );

  return {
    settings: data,
    isLoadingSettings: isLoading,
    settingsError: error,
    refreshSettings: mutate,
  };
}

/**
 * Hook for backend health checking with caching
 * Cache duration: 30 seconds with conditional polling
 */
export function useHealthCheck(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? SWR_KEYS.HEALTH : null,
    apiFetcher.health,
    {
      // Refresh every 30 seconds when enabled
      refreshInterval: enabled ? 30 * 1000 : 0,
      // Allow focus revalidation for health checks
      revalidateOnFocus: true,
      // Retry failed health checks more aggressively
      errorRetryCount: 5,
      errorRetryInterval: 5000,
    }
  );

  return {
    healthData: data,
    // During loading, assume healthy (don't show maintenance page)
    // Only show as unhealthy if we have an error or explicit unhealthy status
    isBackendHealthy: isLoading ? true : (error ? false : data?.status === 'healthy'),
    isLoadingHealth: isLoading,
    healthError: error,
    recheckHealth: mutate,
  };
}

/**
 * Hook for checking if user exists with session-duration caching
 * Cache duration: 5 minutes (stable per session)
 */
export function useUserExistsCheck(token?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    token ? SWR_KEYS.USER_EXISTS(token) : null,
    token ? () => apiFetcher.userExists(token) : null,
    {
      // Cache for 5 minutes - user existence is stable per session
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
      // Don't retry user existence checks as aggressively
      errorRetryCount: 2,
    }
  );

  return {
    userExists: data?.user_exists ?? false,
    isLoadingUserExists: isLoading,
    userExistsError: error,
    recheckUserExists: mutate,
  };
}

/**
 * Hook for fetching GitHub stars count with moderate caching
 * Cache duration: 2 minutes (updated occasionally)
 */
export function useGithubStarsCount(token?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    token ? SWR_KEYS.GITHUB_STARS(token) : null,
    token ? () => apiFetcher.githubStars(token) : null,
    {
      // Refresh every 2 minutes
      refreshInterval: 2 * 60 * 1000,
      revalidateOnFocus: true,
    }
  );

  return {
    totalStars: data?.totalStars ?? 0,
    isLoadingStars: isLoading,
    starsError: error,
    refreshStarsCount: mutate,
  };
}

/**
 * Hook for job status with conditional caching
 * When actively processing: poll every 3 seconds
 * When not processing: cache for 30 seconds
 */
export function useJobStatus(token?: string, isProcessing = false) {
  const { data, error, isLoading, mutate } = useSWR(
    token ? SWR_KEYS.JOB_STATUS(token) : null,
    token ? () => apiFetcher.jobStatus(token) : null,
    {
      // Aggressive polling when processing, moderate caching when idle
      refreshInterval: isProcessing ? 3000 : 30 * 1000,
      revalidateOnFocus: isProcessing,
      // More retries for job status when actively processing
      errorRetryCount: isProcessing ? 5 : 2,
    }
  );

  return {
    jobData: data,
    jobStatus: data?.job,
    isJobRunning: data?.is_running ?? false,
    isLoadingJobStatus: isLoading,
    jobStatusError: error,
    refreshJobStatus: mutate,
  };
} 