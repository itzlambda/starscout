import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseRateLimitHeaders(response: Response): {
  isRateLimited: boolean;
  retryAfter?: number;
  limit?: number;
  remaining?: number;
} {
  const remaining = response.headers.get('x-ratelimit-remaining');
  const limit = response.headers.get('x-ratelimit-limit');
  const retryAfter = response.headers.get('retry-after') || response.headers.get('x-ratelimit-after');

  const remainingNum = remaining ? parseInt(remaining, 10) : undefined;
  const limitNum = limit ? parseInt(limit, 10) : undefined;
  const retryAfterNum = retryAfter ? parseInt(retryAfter, 10) : undefined;

  return {
    isRateLimited: remainingNum === 0,
    retryAfter: retryAfterNum,
    limit: limitNum,
    remaining: remainingNum,
  };
}
