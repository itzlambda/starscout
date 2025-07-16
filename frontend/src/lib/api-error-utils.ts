/**
 * Error categories for API responses
 */
export enum ApiErrorType {
  API_KEY_INVALID = 'api_key_invalid',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  GENERIC = 'generic'
}

/**
 * Parsed error result with type and user-friendly message
 */
export interface ParsedApiError {
  type: ApiErrorType;
  message: string;
  isApiKeyError: boolean;
}

/**
 * Parse an API error and return a user-friendly error message and categorization.
 * Handles common error patterns from backend APIs and provides consistent error messaging.
 * 
 * @param error - The error object or unknown error
 * @returns Parsed error with type and user-friendly message
 */
export function parseApiError(error: unknown): ParsedApiError {
  // Default fallback
  let errorMessage = 'An unexpected error occurred. Please try again.';
  let errorType = ApiErrorType.GENERIC;

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('incorrect api key') || message.includes('invalid_api_key')) {
      errorMessage = 'Invalid OpenAI API key. Please check your API key and try again.';
      errorType = ApiErrorType.API_KEY_INVALID;
    } else if (message.includes('rate limit') || message.includes('too many requests')) {
      errorMessage = 'Too many requests. Please wait a moment and try again.';
      errorType = ApiErrorType.RATE_LIMIT;
    } else if (message.includes('network') || message.includes('fetch')) {
      errorMessage = 'Network error. Please check your connection and try again.';
      errorType = ApiErrorType.NETWORK;
    } else {
      // For other errors, show a generic message but preserve the type
      errorMessage = 'Operation failed. Please try again later.';
      errorType = ApiErrorType.GENERIC;
    }
  }

  return {
    type: errorType,
    message: errorMessage,
    isApiKeyError: errorType === ApiErrorType.API_KEY_INVALID
  };
}

/**
 * Create user-friendly error messages for API key requirements based on user state.
 * 
 * @param userExists - Whether the user exists in the system
 * @param apiKeyThreshold - The star count threshold requiring an API key
 * @param operation - The operation being performed ('search', 'refresh', etc.)
 * @returns User-friendly error message
 */
export function createApiKeyRequiredMessage(
  userExists: boolean, 
  apiKeyThreshold: number, 
  operation: 'search' | 'refresh' = 'search'
): string {
  const baseMessage = `API key is required to ${operation} when you have more than ${apiKeyThreshold} stars`;
  
  if (!userExists) {
    return `${baseMessage} and are a new user. Please provide your OpenAI API key below.`;
  }
  
  return `${baseMessage}. Please provide your OpenAI API key below.`;
} 