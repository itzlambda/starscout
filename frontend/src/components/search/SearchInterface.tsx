"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Octokit } from 'octokit';
import { Info, RefreshCw } from 'lucide-react';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { RateLimitError } from './RateLimitError';
import type { Repository, SearchResult, RateLimitError as RateLimitErrorType } from '@/types/github';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ApiKeyInput, ApiKeyInputRef } from './ApiKeyInput';
import { apiClient } from '@/lib/api-client';
import { useUserExists } from '@/hooks/useUserExists';
import { useInitialization } from '@/hooks/useInitialization';
import { useSearchCache } from '@/hooks/useSearchCache';

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
  const [rateLimitError, setRateLimitError] = useState<RateLimitErrorType | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const apiKeyInputRef = useRef<ApiKeyInputRef>(null);
  const [octokit] = useState<Octokit | null>(() =>
    session?.accessToken ? new Octokit({ auth: session.accessToken }) : null
  );
  const { checkUserExists } = useUserExists();
  const { hasInitializationBeenAttempted, markInitializationAttempted } = useInitialization();
  const searchCache = useSearchCache();

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const exists = await checkUserExists(session?.accessToken || '');
        if (!exists) {
          await onRefreshStars(apiKey);
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      }
    };

    // Run initialization only once per browser session to avoid infinite retry loops
    if (session?.accessToken && !hasInitializationBeenAttempted()) {
      markInitializationAttempted();
      initializeUser();
    }
    // Intentionally exclude `onRefreshStars` from dependencies to keep the effect stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken, apiKey]);

  // Memoized repository transformation function
  const transformRepositories = useCallback((reposArray: (SearchResult | Repository)[]): Repository[] => {
    return reposArray.map((item: SearchResult | Repository) => {
      const repo = 'repository' in item ? item.repository : item;
      // Handle the backend API response structure
      const ownerLogin = typeof repo.owner === 'string' ? repo.owner : repo.owner?.login || 'unknown';

      return {
        id: typeof repo.id === 'string' ? parseInt(repo.id, 10) : repo.id,
        name: repo.name,
        fullName: `${ownerLogin}/${repo.name}`,
        description: repo.description,
        url: (repo as unknown as { homepage_url?: string }).homepage_url || repo.url || `https://github.com/${ownerLogin}/${repo.name}`,
        topics: repo.topics || [],
        owner: {
          login: ownerLogin,
          avatarUrl: typeof repo.owner === 'object' && repo.owner?.avatarUrl
            ? repo.owner.avatarUrl
            : `https://github.com/${ownerLogin}.png`,
        },
      } as Repository;
    });
  }, []);

  // Handle star refresh - invalidate cache
  const handleRefreshStars = useCallback((apiKey?: string) => {
    searchCache.invalidateAll();
    onRefreshStars(apiKey);
  }, [searchCache, onRefreshStars]);

  const handleSearch = async (query: string) => {
    if (!octokit || !session?.accessToken) return;

    setIsLoading(true);
    setRateLimitError(null);
    setSearchError(null);

    try {
      const { data, rateLimitInfo } = await apiClient.search(
        query,
        session.accessToken,
        isGlobalSearch,
        apiKey
      );

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

      // Rust backend returns {results: [{repository, similarity_score}], ...},
      // Fallback to legacy array for backward compatibility
      const reposArray = Array.isArray(data) ? data : (data as { results?: unknown[] })?.results ?? [];

      // Check cache first
      const cachedResults = searchCache.get(query, isGlobalSearch, data);
      if (cachedResults) {
        setRepositories(cachedResults);
      } else {
        // Transform and cache the results
        const transformedRepos = transformRepositories(reposArray);
        searchCache.set(query, isGlobalSearch, data, transformedRepos);
        setRepositories(transformedRepos);
      }
    } catch (error) {
      console.error("Error searching repositories:", error);
      setRepositories([]); // Clear previous results

      // Extract user-friendly error message
      let errorMessage = 'An unexpected error occurred while searching. Please try again.';
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('incorrect api key') || message.includes('invalid_api_key')) {
          errorMessage = 'Invalid OpenAI API key. Please check your API key and try again.';
        } else if (message.includes('rate limit') || message.includes('too many requests')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (message.includes('network') || message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          // For other errors, show a generic message but log the full error
          errorMessage = 'Search failed. Please try again or contact support if the issue persists.';
        }
      }

      setSearchError(errorMessage);
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
              onClick={() => handleRefreshStars(apiKey)}
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
            error={searchError}
            onApiKeyClick={handleApiKeyClick}
          />
        )}
      </>
    </div>
  );
} 