export interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  topics: string[];
  owner: {
    login: string;
    avatarUrl: string;
  };
}

export interface UserJob {
  id: number;
  user_id: string | number;
  status: string;
  total_repos: number;
  processed_repos: number;
  failed_repos: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ExistsResponse {
  user_exists: boolean;
}

export interface JobStatusResponse {
  job: UserJob | null;
  is_running: boolean;
  user_id: string | number;
  total_active_jobs: number;
  message?: string;
}

export interface SearchResult {
  repository: Repository;
  similarity_score: number;
}

export interface SearchResponse {
  query: string;
  total_count: number;
  results: SearchResult[];
}

export interface RateLimitHeaders {
  'x-ratelimit-after'?: string;
  'retry-after'?: string;
  'x-ratelimit-limit'?: string;
  'x-ratelimit-remaining'?: string;
}

export interface RateLimitError {
  isRateLimited: boolean;
  retryAfter?: number;
  limit?: number;
  remaining?: number;
  message: string;
} 