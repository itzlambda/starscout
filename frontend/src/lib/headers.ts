/**
 * Common header utilities for API requests
 * Consolidates header generation logic across the application
 */

export interface HeaderOptions {
  accessToken?: string;
  apiKey?: string;
  contentType?: string;
  accept?: string;
  userAgent?: string;
}

/**
 * Default headers for JSON API requests
 */
export const DEFAULT_JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
} as const;

/**
 * Creates standardized headers for API requests
 * @param options - Header configuration options
 * @returns Headers object ready for fetch requests
 */
export function createApiHeaders(options: HeaderOptions = {}): Record<string, string> {
  const headers: Record<string, string> = {
    ...DEFAULT_JSON_HEADERS,
  };

  // Override default content type if specified
  if (options.contentType) {
    headers['Content-Type'] = options.contentType;
  }

  // Override default accept if specified
  if (options.accept) {
    headers['Accept'] = options.accept;
  }

  // Add authorization header for OAuth tokens
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  // Add API key header for OpenAI and similar services
  if (options.apiKey) {
    headers.api_key = options.apiKey;
  }

  // Add user agent if specified
  if (options.userAgent) {
    headers['User-Agent'] = options.userAgent;
  }

  return headers;
}

/**
 * Creates headers specifically for GitHub API requests
 * @param accessToken - GitHub OAuth access token
 * @param userAgent - Optional user agent string
 * @returns Headers optimized for GitHub API
 */
export function createGitHubHeaders(accessToken: string, userAgent?: string): Record<string, string> {
  return createApiHeaders({
    accessToken,
    accept: 'application/vnd.github.v3+json',
    userAgent: userAgent || 'starscout-app',
  });
}

/**
 * Creates headers for backend API requests with optional API key
 * @param accessToken - OAuth access token
 * @param apiKey - Optional OpenAI API key
 * @returns Headers for backend API calls
 */
export function createBackendHeaders(accessToken?: string, apiKey?: string): Record<string, string> {
  return createApiHeaders({
    accessToken,
    apiKey,
  });
}

/**
 * Creates minimal headers for health checks and public endpoints
 * @returns Basic headers for public API calls
 */
export function createPublicHeaders(): Record<string, string> {
  return createApiHeaders();
} 