import { useState, useEffect, useCallback, useRef } from 'react';

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  debounceMs: number = 300
): [T, (value: T) => void] {
  // State to store the current value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Get from local storage by key
      if (typeof window === 'undefined') {
        return defaultValue;
      }
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return defaultValue
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      // If error also return defaultValue
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Ref to store the timeout ID for debouncing
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to save to localStorage with debouncing
  const setValue = useCallback((value: T) => {
    try {
      // Update state immediately for responsive UI
      setStoredValue(value);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for debounced save
      timeoutRef.current = setTimeout(() => {
        try {
          if (typeof window !== 'undefined') {
            // Save to local storage
            window.localStorage.setItem(key, JSON.stringify(value));
          }
        } catch (error) {
          console.warn(`Error writing to localStorage key "${key}":`, error);
          // Could implement fallback storage or user notification here
        }
      }, debounceMs);
    } catch (error) {
      console.warn(`Error in setValue for localStorage key "${key}":`, error);
    }
  }, [key, debounceMs]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [storedValue, setValue];
} 