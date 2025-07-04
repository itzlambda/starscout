"use client";

import { useState, useEffect, useCallback } from 'react';
import { UserJob } from '@/types/github';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export function useGithubStars() {
  const { data: session } = useSession() as { data: Session | null };
  const [processingStars, setProcessingStars] = useState(false);
  const [jobStatus, setJobStatus] = useState<UserJob | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Checks if the authenticated user exists in the backend
  const checkUserExists = useCallback(async (): Promise<boolean> => {
    if (!session?.accessToken) return false;

    try {
      const response = await fetch(`${BACKEND_API_URL}/user/exists`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check if user exists');
      }

      const data = await response.json();
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
      const response = await fetch(`${BACKEND_API_URL}/jobs/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get job status');
      }

      const data = await response.json();
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
      const response = await fetch(`${BACKEND_API_URL}/jobs/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
      });
      if (!response.ok) {
        if (response.status === 404) {
          return { job: null, is_running: false };
        }
        throw new Error('Failed to check existing jobs');
      }
      const data = await response.json();
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

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`
      };

      if (apiKey) {
        headers['api_key'] = apiKey;
      }

      const response = await fetch(`${BACKEND_API_URL}/user/process_star`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to process starred repositories');
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
    refreshStars,
    startProcessing
  };
} 