"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Octokit } from 'octokit';
import { Info, RefreshCw } from 'lucide-react';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { RateLimitError } from './RateLimitError';
import { Repository } from '@/components/repository/RepositoryCard';
import type { SearchResult, RateLimitError as RateLimitErrorType } from '@/types/github';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ApiKeyInput, ApiKeyInputRef } from './ApiKeyInput';
import { parseRateLimitHeaders } from '@/lib/utils';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

interface SearchInterfaceProps {
  onRefreshStars: (apiKey?: string) => void;
  totalStars: number;
  apiKeyThreshold: number;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
}

// Tracks whether we've already attempted to initialize the user during this browser session.
// Because it's a module-level variable, it survives component unmount/remount cycles.
let initializationAttempted = false;

export function SearchInterface({ onRefreshStars, totalStars, apiKeyThreshold, apiKey, onApiKeyChange }: SearchInterfaceProps) {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<RateLimitErrorType | null>(null);
  const apiKeyInputRef = useRef<ApiKeyInputRef>(null);
  const [octokit] = useState<Octokit | null>(() =>
    session?.accessToken ? new Octokit({ auth: session.accessToken }) : null
  );

  const checkUserExists = useCallback(async () => {
    if (!session?.accessToken) return false;
    try {
      const response = await fetch(`${BACKEND_API_URL}/user/exists`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to check user existence');
      }
      const data = await response.json();
      return Boolean(data.user_exists);
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

    // Run initialization only once per browser session to avoid infinite retry loops
    if (session?.accessToken && !initializationAttempted) {
      initializationAttempted = true;
      initializeUser();
    }
    // Intentionally exclude `onRefreshStars` from dependencies to keep the effect stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken, checkUserExists, apiKey]);

  const handleSearch = async (query: string) => {
    if (!octokit || !session?.accessToken) return;

    setIsLoading(true);
    setRateLimitError(null);

    try {
      const endpoint = isGlobalSearch ? 'search_global' : 'search';
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

      // Parse rate limit headers regardless of response status
      const rateLimitInfo = parseRateLimitHeaders(response);

      if (rateLimitInfo.isRateLimited) {
        setRateLimitError({
          isRateLimited: true,
          retryAfter: rateLimitInfo.retryAfter,
          limit: rateLimitInfo.limit,
          remaining: rateLimitInfo.remaining,
          message: "You've exceeded the search rate limit. Please wait before trying again.",
        });
        setRepositories([]); // Clear previous results
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }

      const data = await response.json();

      // Rust backend returns {results: [{repository, similarity_score}], ...},
      // Fallback to legacy array for backward compatibility
      const reposArray = Array.isArray(data) ? data : data.results ?? [];

      setRepositories(reposArray.map((item: SearchResult | Repository) => {
        const repo = 'repository' in item ? item.repository : item;
        // Handle the backend API response structure
        const ownerLogin = typeof repo.owner === 'string' ? repo.owner : repo.owner?.login || 'unknown';

        return {
          id: typeof repo.id === 'string' ? parseInt(repo.id, 10) : repo.id,
          name: repo.name,
          fullName: `${ownerLogin}/${repo.name}`,
          description: repo.description,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          url: (repo as any).homepage_url || repo.url || `https://github.com/${ownerLogin}/${repo.name}`,
          topics: repo.topics || [],
          owner: {
            login: ownerLogin,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            avatarUrl: typeof repo.owner === 'object' && repo.owner?.avatarUrl
              ? repo.owner.avatarUrl
              : `https://github.com/${ownerLogin}.png`,
          },
        } as Repository;
      }));
    } catch (error) {
      console.error("Error searching repositories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const requiresApiKey = totalStars > apiKeyThreshold;

  const handleApiKeyClick = () => {
    // Focus and highlight the API key input
    if (apiKeyInputRef.current) {
      apiKeyInputRef.current.focusAndHighlight();
    }
  };

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
            ref={apiKeyInputRef}
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

        {rateLimitError ? (
          <RateLimitError
            error={rateLimitError}
            onApiKeyClick={handleApiKeyClick}
          />
        ) : (
          <SearchResults
            repositories={repositories}
            isLoading={isLoading}
            emptyMessage="Enter a search query to find repositories"
          />
        )}
      </>
    </div>
  );
} 