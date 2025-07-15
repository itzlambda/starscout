"use client";

import { useState, useCallback } from 'react';
import { UserJob } from '@/types/github';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import { apiClient } from '@/lib/api-client';
import { useUserExists } from './useUserExists';
import { usePolling } from './usePolling';
import { useRateLimit } from './useRateLimit';

export function useGithubStars() {
  const { data: session } = useSession() as { data: Session | null };
  const [processingStars, setProcessingStars] = useState(false);
  const [jobStatus, setJobStatus] = useState<UserJob | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const rateLimit = useRateLimit();
  const { checkUserExists } = useUserExists();

  // Polls the /jobs/status endpoint for the current user's job
  const pollJobStatus = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      const data = await apiClient.getJobStatus(session.accessToken);
      setJobStatus(data.job);

      if (!data.job || data.job.status === 'completed' || data.job.status === 'failed') {
        setProcessingStars(false);
        setIsRefreshing(false);
      }
    } catch (error) {
      console.error("Error polling job status:", error);
      setProcessingStars(false);
      setIsRefreshing(false);
    }
  }, [session]);

  // Use polling hook for job status updates
  usePolling(pollJobStatus, {
    enabled: processingStars,
    interval: 3000, // Poll every 3 seconds
    onError: (error) => {
      console.error('Error polling job status:', error);
      setProcessingStars(false);
      setIsRefreshing(false);
    },
  });

  // Checks if there is an existing job for the user
  const checkExistingJobs = useCallback(async () => {
    if (!session?.accessToken) return { job: null, is_running: false };
    try {
      const data = await apiClient.getJobStatus(session.accessToken);
      return { job: data.job, is_running: data.is_running };
    } catch (error) {
      console.error("Error checking existing jobs:", error);
      return { job: null, is_running: false };
    }
  }, [session]);

  // Triggers the backend to start processing stars
  const processUserStars = useCallback(async (apiKey?: string, forceRefresh = false) => {
    if (!session?.accessToken) return;

    try {
      setProcessingStars(true);
      setIsRefreshing(forceRefresh);
      rateLimit.clearRateLimit();

      const { rateLimitInfo } = await apiClient.processUserStars(session.accessToken, apiKey);

      const isRateLimited = rateLimit.handleRateLimitInfo(
        rateLimitInfo,
        "You've exceeded the star processing rate limit. Please wait before trying again."
      );

      if (isRateLimited) {
        setProcessingStars(false);
        setIsRefreshing(false);
        return;
      }

      // After triggering, immediately poll status
      await pollJobStatus();
    } catch (error) {
      console.error("Error processing starred repositories:", error);
      setProcessingStars(false);
      setIsRefreshing(false);
    }
  }, [session, pollJobStatus, rateLimit]);

  const startProcessing = async (apiKey?: string) => {
    try {
      // Step 1: check if the user already exists in the backend
      const userExists = await checkUserExists(session?.accessToken || '');

      // Step 2: if the user exists, check for any running job
      let jobInfo = { job: null as UserJob | null, is_running: false };
      if (userExists) {
        jobInfo = await checkExistingJobs();
      }

      const { job, is_running } = jobInfo;

      if (is_running && job) {
        // A job is already in progress – just start polling its status
        setProcessingStars(true);
        setJobStatus(job);
        await pollJobStatus();
        return;
      }

      // If the user doesn't exist or no job is running, start a new job
      await processUserStars(apiKey);
    } catch (error) {
      console.error("Error in startProcessing:", error);
      setProcessingStars(false);
      setIsRefreshing(false);
    }
  };

  const refreshStars = async (apiKey?: string) => {
    try {
      // Always attempt to refresh but avoid starting a duplicate job
      const userExists = await checkUserExists(session?.accessToken || '');

      let jobInfo = { job: null as UserJob | null, is_running: false };
      if (userExists) {
        jobInfo = await checkExistingJobs();
      }

      const { job, is_running } = jobInfo;

      if (is_running && job) {
        // Job already running – just continue polling
        setProcessingStars(true);
        setJobStatus(job);
        await pollJobStatus();
        return;
      }

      // Start a new job if none is running
      await processUserStars(apiKey, true);
    } catch (error) {
      console.error("Error in refreshStars:", error);
      setProcessingStars(false);
      setIsRefreshing(false);
    }
  };

  return {
    processingStars,
    jobStatus,
    isRefreshing,
    rateLimitError: rateLimit.rateLimitError,
    refreshStars,
    startProcessing
  };
} 