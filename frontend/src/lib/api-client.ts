import { parseRateLimitHeaders } from './utils';
import type { UserJob } from '@/types/github';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface ApiOptions {
  accessToken?: string;
  apiKey?: string;
}

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_BACKEND_API_URL || '';
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<{
    data: T;
    rateLimitInfo: ReturnType<typeof parseRateLimitHeaders>;
  }> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      body: options.body,
    });

    const rateLimitInfo = parseRateLimitHeaders(response);

    if (!response.ok) {
      // Try to parse error message from response body
      let errorMessage: string;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || `${response.status} ${response.statusText}`;
      } catch {
        // If parsing fails, fall back to status text
        errorMessage = `API request failed: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return { data, rateLimitInfo };
  }

  private createHeaders(options: ApiOptions = {}): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (options.accessToken) {
      headers.Authorization = `Bearer ${options.accessToken}`;
    }
    
    if (options.apiKey) {
      headers.api_key = options.apiKey;
    }
    
    return headers;
  }

  async checkUserExists(accessToken: string): Promise<{ user_exists: boolean }> {
    const { data } = await this.request<{ user_exists: boolean }>('/user/exists', {
      headers: this.createHeaders({ accessToken }),
    });
    return data;
  }

  async processUserStars(accessToken: string, apiKey?: string): Promise<{
    rateLimitInfo: ReturnType<typeof parseRateLimitHeaders>;
  }> {
    const { rateLimitInfo } = await this.request('/user/process_star', {
      headers: this.createHeaders({ accessToken, apiKey }),
    });
    return { rateLimitInfo };
  }

  async getJobStatus(accessToken: string): Promise<{
    job: UserJob | null;
    is_running: boolean;
    user_id: string | number;
    total_active_jobs: number;
    message?: string;
  }> {
    const { data } = await this.request<{
      job: UserJob | null;
      is_running: boolean;
      user_id: string | number;
      total_active_jobs: number;
      message?: string;
    }>('/jobs/status', {
      headers: this.createHeaders({ accessToken }),
    });
    return data;
  }

  async search(
    query: string,
    accessToken: string,
    isGlobal = false,
    apiKey?: string
  ): Promise<{
    data: unknown;
    rateLimitInfo: ReturnType<typeof parseRateLimitHeaders>;
  }> {
    const endpoint = isGlobal ? 'search_global' : 'search';
    return this.request(`/${endpoint}?query=${encodeURIComponent(query)}`, {
      headers: this.createHeaders({ accessToken, apiKey }),
    });
  }

  async getSettings(): Promise<{ api_key_star_threshold: number }> {
    const { data } = await this.request<{ api_key_star_threshold: number }>('/settings');
    return data;
  }

  async checkHealth(): Promise<{ status: string }> {
    const { data } = await this.request<{ status: string }>('/');
    return data;
  }
}

export const apiClient = new ApiClient(); 