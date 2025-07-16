"use client";

import { ReactNode, Suspense } from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { RateLimitError } from '@/components/search/RateLimitError';
import { ProcessingStatus } from '@/components/github/ProcessingStatus';
import { SearchInterface } from '@/components/search/SearchInterface';
import { Skeleton } from '@/components/ui/skeleton';
import type { RateLimitError as RateLimitErrorType, UserJob } from '@/types/github';

interface SafePageContentProps {
    currentView: 'home' | 'search';
    rateLimitError: RateLimitErrorType | null;
    processingStars: boolean;
    jobStatus: UserJob | null;
    onNavigateToSearch: () => void;
    onRefreshStars: (apiKey?: string) => void;
    totalStars: number;
    apiKeyThreshold: number;
    apiKey: string;
    onApiKeyChange: (value: string) => void;
    isRefreshing: boolean;
    onSetCurrentView: (view: 'search') => void;
}

/**
 * Handles conditional page content rendering with automatic error boundaries.
 * Eliminates the need to manually wrap each conditional branch with ErrorBoundary.
 */
export function SafePageContent({
    currentView,
    rateLimitError,
    processingStars,
    jobStatus,
    onNavigateToSearch,
    onRefreshStars,
    totalStars,
    apiKeyThreshold,
    apiKey,
    onApiKeyChange,
    isRefreshing,
    onSetCurrentView
}: SafePageContentProps) {
    const renderContent = (): ReactNode => {
        if (currentView === 'home') {
            return (
                <OnboardingContent
                    onNavigateToSearch={onNavigateToSearch}
                    apiKeyThreshold={apiKeyThreshold}
                />
            );
        }

        if (rateLimitError) {
            return (
                <RateLimitError
                    error={rateLimitError}
                    onApiKeyClick={() => onSetCurrentView('search')}
                />
            );
        }

        if (processingStars) {
            return (
                <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-xl" />}>
                    <ProcessingStatus jobStatus={jobStatus} />
                </Suspense>
            );
        }

        return (
            <Suspense fallback={<Skeleton className="h-[600px] w-full rounded-xl" />}>
                <SearchInterface
                    onRefreshStars={onRefreshStars}
                    totalStars={totalStars}
                    apiKeyThreshold={apiKeyThreshold}
                    apiKey={apiKey}
                    onApiKeyChange={onApiKeyChange}
                    isRefreshing={isRefreshing}
                />
            </Suspense>
        );
    };

    return (
        <ErrorBoundary>
            {renderContent()}
        </ErrorBoundary>
    );
} 