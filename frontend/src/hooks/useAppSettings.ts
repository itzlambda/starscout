import { useSettings } from './useSwrApi';

/**
 * App-specific settings interface
 */
export interface AppSettings {
  api_key_star_threshold: number;
}

/**
 * Default settings values to prevent undefined states
 */
const DEFAULT_SETTINGS: AppSettings = {
  api_key_star_threshold: 5000,
};

/**
 * Hook for managing application settings with proper defaults and error handling
 * Provides a clean API for accessing settings throughout the app
 */
export function useAppSettings() {
  const { settings, isLoadingSettings, settingsError, refreshSettings } = useSettings();
  
  // Merge fetched settings with defaults to ensure no undefined values
  const appSettings: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...settings,
  };

  return {
    // Settings values with guaranteed defaults
    settings: appSettings,
    apiKeyThreshold: appSettings.api_key_star_threshold,
    
    // Loading and error states
    isLoading: isLoadingSettings,
    error: settingsError,
    
    // Actions
    refresh: refreshSettings,
    
    // Computed states
    hasError: !!settingsError,
    isReady: !isLoadingSettings && !settingsError,
  };
}

/**
 * Hook for just the API key threshold (most commonly used setting)
 * Provides a simple API for components that only need this one value
 */
export function useApiKeyThreshold() {
  const { apiKeyThreshold, isLoading, error } = useAppSettings();
  
  return {
    apiKeyThreshold,
    isLoading,
    error,
  };
} 