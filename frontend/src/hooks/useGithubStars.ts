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
  const [jobId, setJobId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pollJobStatus = useCallback(async (id: number) => {
    if (!session?.accessToken) return;
    
    try {
      const response = await fetch(`${BACKEND_API_URL}/job-status/${id}`, {
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
      
      const status = await response.json();
      setJobStatus(status);
      
      if (status.status === 'completed' || status.status === 'failed') {
        setProcessingStars(false);
        setIsRefreshing(false);
        setJobId(null);
      }
    } catch (error) {
      console.error("Error polling job status:", error);
      setJobId(null);
      setProcessingStars(false);
      setIsRefreshing(false);
    }
  }, [session]);

  const checkExistingJobs = useCallback(async () => {
    if (!session?.accessToken) return null;
    
    try {
      const response = await fetch(`${BACKEND_API_URL}/user-jobs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to check existing jobs');
      }
      
      const latestJob: UserJob | null = await response.json();
      return latestJob;
      
    } catch (error) {
      console.error("Error checking existing jobs:", error);
      return null;
    }
  }, [session]);

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
      
      const response = await fetch(`${BACKEND_API_URL}/process-stars?force_refresh=${forceRefresh}`, {
        method: 'POST',
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Failed to process starred repositories');
      }
      
      const job = await response.json();
      setJobId(job.id);
      
      await pollJobStatus(job.id);
    } catch (error) {
      console.error("Error processing starred repositories:", error);
      setProcessingStars(false);
      setIsRefreshing(false);
    }
  }, [session, pollJobStatus]);

  useEffect(() => {
    // Poll job status if there is an active job ID
    if (jobId) {
      const interval = setInterval(() => {
        pollJobStatus(jobId);
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [jobId, pollJobStatus]);



  const startProcessing = async (apiKey?: string) => {
    const existingJob = await checkExistingJobs();
    
    if (existingJob) {
      if (existingJob.status === 'pending' || existingJob.status === 'processing') {
        setJobId(existingJob.id);
        setProcessingStars(true);
        await pollJobStatus(existingJob.id);
      } else if (existingJob.status === 'failed') {
        processUserStars(true, apiKey);
      }
    } else {
      processUserStars(false, apiKey);
    }
  };

  const refreshStars = (apiKey?: string) => {
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