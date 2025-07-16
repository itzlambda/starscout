import type { Repository, SearchResult } from '@/types/github';

/**
 * Transform search results or repositories into standardized Repository objects.
 * Handles the backend API response structure variations and normalizes the data.
 * 
 * @param reposArray - Array of SearchResult or Repository objects from the API
 * @returns Array of normalized Repository objects
 */
export function transformRepositories(reposArray: (SearchResult | Repository)[]): Repository[] {
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
} 