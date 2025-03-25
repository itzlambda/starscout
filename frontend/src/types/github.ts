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
  user_id: string;
  status: string;
  total_repos: number;
  processed_repos: number;
  failed_repos: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
} 