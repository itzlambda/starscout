"use client";

import { useState, useEffect, useCallback } from 'react';
import { UserJob, RateLimitError } from '@/types/github';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import { apiClient } from '@/lib/api-client';

export function useGithubStars() {
  const { data: session } = useSession() as { data: Session | null };
  const [processingStars, setProcessingStars] = useState(false);
  const [jobStatus, setJobStatus] = useState<UserJob | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<RateLimitError | null>(null);

  // Checks if the authenticated user exists in the backend
  const checkUserExists = useCallback(async (): Promise<boolean> => {
    if (!session?.accessToken) return false;

    try {
      const data = await apiClient.checkUserExists(session.accessToken);
      return Boolean(data.user_exists);
    } catch (error) {
      console.error('Error checking if user exists:', error);
      return false;
    }
  }, [session]);

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
  const processUserStars = useCallback(async (forceRefresh = false, apiKey?: string) => {
    if (!session?.accessToken) return;

    try {
      setProcessingStars(true);
      setIsRefreshing(forceRefresh);
      setRateLimitError(null);

      const { rateLimitInfo } = await apiClient.processUserStars(session.accessToken, apiKey);

      if (rateLimitInfo.isRateLimited) {
        setRateLimitError({
          isRateLimited: true,
          retryAfter: rateLimitInfo.retryAfter,
          limit: rateLimitInfo.limit,
          remaining: rateLimitInfo.remaining,
          message: "You've exceeded the star processing rate limit. Please wait before trying again.",
        });
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
  }, [session, pollJobStatus]);

  useEffect(() => {
    // Poll job status every 3 seconds if processing
    if (processingStars) {
      const interval = setInterval(() => {
        pollJobStatus();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [processingStars, pollJobStatus]);

  const startProcessing = async (apiKey?: string) => {
    // Step 1: check if the user already exists in the backend
    const userExists = await checkUserExists();

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

    if (job && job.status === 'failed') {
      // Previous job failed – allow user to retry by forcing refresh
      processUserStars(true, apiKey);
      return;
    }

    // If the user doesn't exist or no job is running, start a new job
    processUserStars(false, apiKey);
  };

  const refreshStars = async (apiKey?: string) => {
    // Always attempt to refresh but avoid starting a duplicate job
    const userExists = await checkUserExists();

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

    // Force refresh to reprocess repositories or start a new job if none is running
    processUserStars(true, apiKey);
  };

  return {
    processingStars,
    jobStatus,
    isRefreshing,
    rateLimitError,
    refreshStars,
    startProcessing
  };
} 