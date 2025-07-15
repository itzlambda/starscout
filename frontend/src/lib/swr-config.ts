import { SWRConfiguration } from 'swr';
import { apiClient } from './api-client';
import { createGitHubHeaders } from './headers';

// Default SWR configuration
export const swrConfig: SWRConfiguration = {
  // Global error handler
  onError: (error, key) => {
    console.error('SWR Error:', error, 'Key:', key);
  },
  
  // Default revalidation settings
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  
  // Default cache time: 5 minutes
  dedupingInterval: 5 * 60 * 1000,
  
  // Retry configuration
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  
  // Loading timeout
  loadingTimeout: 10000,
};

// Fetcher function for API client methods
export const apiFetcher = {
  // Settings endpoint - cache for 10 minutes (rarely changes)
  settings: () => apiClient.getSettings(),
  
  // Health check - cache for 30 seconds  
  health: () => apiClient.checkHealth(),
  
  // Job status - cache for 5 seconds when not actively processing
  jobStatus: (token: string) => apiClient.getJobStatus(token),
  
  // User exists check - cache for session duration (5 minutes)
  userExists: (token: string) => apiClient.checkUserExists(token),
  
  // GitHub user stars count - cache for 2 minutes
  githubStars: async (token: string) => {
    const response = await fetch('https://api.github.com/user/starred?per_page=1', {
      headers: createGitHubHeaders(token),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub stars');
    }

    const linkHeader = response.headers.get('Link');
    if (linkHeader) {
      const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
      if (match) {
        return { totalStars: parseInt(match[1]) };
      }
    }
    
    return { totalStars: 0 };
  },
};

// SWR keys for different endpoints
export const SWR_KEYS = {
  SETTINGS: 'settings',
  HEALTH: 'health', 
  JOB_STATUS: (token: string) => `job-status-${token}`,
  USER_EXISTS: (token: string) => `user-exists-${token}`,
  GITHUB_STARS: (token: string) => `github-stars-${token}`,
} as const; 