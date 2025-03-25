"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Octokit } from 'octokit';
import { Info, RefreshCw } from 'lucide-react';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { Repository } from '@/components/repository/RepositoryCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ApiKeyInput } from './ApiKeyInput';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

interface SearchInterfaceProps {
  onRefreshStars: (apiKey?: string) => void;
  totalStars: number;
  apiKeyThreshold: number;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
}

export function SearchInterface({ onRefreshStars, totalStars, apiKeyThreshold, apiKey, onApiKeyChange }: SearchInterfaceProps) {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [octokit] = useState<Octokit | null>(() =>
    session?.accessToken ? new Octokit({ auth: session.accessToken }) : null
  );

  const checkUserExists = useCallback(async () => {
    if (!session?.accessToken) return false;
    try {
      const response = await fetch(`${BACKEND_API_URL}/user-exists`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to check user existence');
      }
      const data = await response.json();
      return data.user_exists;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  }, [session?.accessToken]);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const exists = await checkUserExists();
        if (!exists) {
          await onRefreshStars(apiKey);
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      }
    };

    if (session?.accessToken) {
      initializeUser();
    }
  }, [session?.accessToken, onRefreshStars, checkUserExists, apiKey]);

  const handleSearch = async (query: string) => {
    if (!octokit || !session?.accessToken) return;

    setIsLoading(true);
    try {
      const endpoint = isGlobalSearch ? 'search-global' : 'search';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
      };

      if (apiKey) {
        headers['api_key'] = apiKey;
      }

      const response = await fetch(`${BACKEND_API_URL}/${endpoint}?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      const data = await response.json();

      setRepositories(data.map((repo: {
        id: number;
        name: string;
        full_name: string;
        description: string | null;
        url: string;
        topics: string[];
        owner: {
          login: string;
          avatar_url: string;
        };
      }) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.url,
        topics: repo.topics || [],
        owner: {
          login: repo.owner.login,
          avatarUrl: repo.owner.avatar_url
        }
      })));
    } catch (error) {
      console.error("Error searching repositories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const requiresApiKey = totalStars > apiKeyThreshold;

  return (
    <div className="flex flex-col gap-8">
      <>
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <SearchInput
                onSearch={handleSearch}
                disabled={requiresApiKey && !apiKey}
                disabledTooltip='Please provide your OpenAI API key to enable search'
              />
            </div>
            <Button
              onClick={() => onRefreshStars(apiKey)}
              variant="outline"
              className="flex items-center gap-2 h-12 whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sm:block hidden">Refresh Stars</span>
            </Button>
          </div>

          <ApiKeyInput
            apiKey={apiKey}
            onApiKeyChange={onApiKeyChange}
            apiKeyThreshold={apiKeyThreshold}
            required={requiresApiKey}
          />

          <div className="flex items-center gap-2 bg-secondary/5 rounded-lg">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground">Global Search</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="h-7 w-7 cursor-pointer"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px]">
                  <p>
                    When enabled, the search will be performed across all repositories in our database, not just your starred ones. This helps you discover new repositories you haven&apos;t starred yet.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Switch
              id="global-search"
              checked={isGlobalSearch}
              onCheckedChange={setIsGlobalSearch}
            />
          </div>
        </div>

        <SearchResults
          repositories={repositories}
          isLoading={isLoading}
          emptyMessage="Enter a search query to find repositories"
        />
      </>
    </div>
  );
} 