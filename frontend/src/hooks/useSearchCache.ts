import { useState, useCallback, useRef } from 'react';
import type { Repository } from '@/types/github';

interface CacheEntry {
  data: Repository[];
  timestamp: number;
  query: string;
  isGlobal: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_CACHE_SIZE = 50; // Maximum number of cached searches

export function useSearchCache() {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const [stats, setStats] = useState<CacheStats>({ hits: 0, misses: 0, size: 0 });

  const generateCacheKey = useCallback((query: string, isGlobal: boolean, dataHash: string): string => {
    return `${isGlobal ? 'global' : 'personal'}:${query.toLowerCase().trim()}:${dataHash}`;
  }, []);

  const hashData = useCallback((data: unknown): string => {
    // Simple hash function for data - in production you might want a better hash
    return JSON.stringify(data).length.toString();
  }, []);

  const isExpired = useCallback((timestamp: number): boolean => {
    return Date.now() - timestamp > CACHE_DURATION;
  }, []);

  const cleanExpiredEntries = useCallback(() => {
    const cache = cacheRef.current;
    
    for (const [key, entry] of cache.entries()) {
      if (isExpired(entry.timestamp)) {
        cache.delete(key);
      }
    }

    // If cache is still too large, remove oldest entries
    if (cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
      const entriesToRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
      
      for (const [key] of entriesToRemove) {
        cache.delete(key);
      }
    }

    setStats(prev => ({ ...prev, size: cache.size }));
  }, [isExpired]);

  const get = useCallback((query: string, isGlobal: boolean, rawData: unknown): Repository[] | null => {
    const dataHash = hashData(rawData);
    const key = generateCacheKey(query, isGlobal, dataHash);
    const entry = cacheRef.current.get(key);

    if (!entry || isExpired(entry.timestamp)) {
      setStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    setStats(prev => ({ ...prev, hits: prev.hits + 1 }));
    return entry.data;
  }, [generateCacheKey, hashData, isExpired]);

  const set = useCallback((
    query: string, 
    isGlobal: boolean, 
    rawData: unknown, 
    repositories: Repository[]
  ): void => {
    cleanExpiredEntries();

    const dataHash = hashData(rawData);
    const key = generateCacheKey(query, isGlobal, dataHash);
    
    cacheRef.current.set(key, {
      data: repositories,
      timestamp: Date.now(),
      query,
      isGlobal,
    });

    setStats(prev => ({ ...prev, size: cacheRef.current.size }));
  }, [generateCacheKey, hashData, cleanExpiredEntries]);

  const invalidateAll = useCallback(() => {
    cacheRef.current.clear();
    setStats({ hits: 0, misses: 0, size: 0 });
  }, []);

  const invalidateByQuery = useCallback((query: string) => {
    const cache = cacheRef.current;
    const keysToDelete: string[] = [];

    for (const [key, entry] of cache.entries()) {
      if (entry.query === query) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => cache.delete(key));
    setStats(prev => ({ ...prev, size: cache.size }));
  }, []);

  return {
    get,
    set,
    invalidateAll,
    invalidateByQuery,
    stats,
  };
} 