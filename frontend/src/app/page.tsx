"use client";

import { useSession } from "next-auth/react";
import { useGithubStars } from "@/hooks/useGithubStars";
import { RateLimitError } from "@/components/search/RateLimitError";
import { LandingContent } from "@/components/landing/LandingContent";
import { OnboardingContent } from "@/components/onboarding/OnboardingContent";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { GridBackground } from "@/components/ui/GridBackground";
import { useState, Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Session } from "next-auth"
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { MaintenancePage } from "@/components/maintenance/MaintenancePage";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { useGithubStarsCount } from "@/hooks/useSwrApi";
import { useApiKeyThreshold } from "@/hooks/useAppSettings";
import { PageSkeleton } from "@/components/layout/PageSkeleton";

// Lazy load large components to improve initial bundle size
const ProcessingStatus = lazy(() => import("@/components/github/ProcessingStatus").then(module => ({ default: module.ProcessingStatus })));
const SearchInterface = lazy(() => import("@/components/search/SearchInterface").then(module => ({ default: module.SearchInterface })));

export default function Home() {
  const { data: session }: { data: Session | null } = useSession();
  const { isBackendHealthy } = useBackendHealth();
  const { processingStars, jobStatus, isRefreshing, rateLimitError, refreshStars, startProcessing } = useGithubStars();
  const [hasStartedProcessing, setHasStartedProcessing] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'search'>(hasStartedProcessing ? 'search' : 'home');
  const [apiKey, setApiKey] = useLocalStorage('openai_api_key', '');

  // Use SWR for caching API responses
  const { totalStars, isLoadingStars } = useGithubStarsCount(session?.accessToken);
  const { apiKeyThreshold } = useApiKeyThreshold();


  const handleStartProcessing = () => {
    setHasStartedProcessing(true);
    setCurrentView('search');
    startProcessing(apiKey);
  };

  const handleNavigation = (view: 'home' | 'search') => {
    setCurrentView(view);
    if (view === 'home') {
      setHasStartedProcessing(false);
    } else {
      setHasStartedProcessing(true);
    }
  };

  if (!isBackendHealthy) {
    return <MaintenancePage />;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-background via-background/95 to-background/90 px-4 pt-24 pb-4">
          <GridBackground className="max-w-4/5">
            <LandingContent />
          </GridBackground>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoadingStars) {
    return <PageSkeleton />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary>
        <Navbar currentView={currentView} onNavigate={handleNavigation} totalStars={totalStars} />
      </ErrorBoundary>
      <main className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-background via-background/95 to-background/90 px-4 pt-24 pb-4">
        <GridBackground className="max-w-4xl">
          <div className="space-y-8">
            {currentView === 'home' ? (
              <ErrorBoundary>
                <OnboardingContent
                  onStartProcessing={handleStartProcessing}
                  apiKeyThreshold={apiKeyThreshold}
                />
              </ErrorBoundary>
            ) : rateLimitError ? (
              <ErrorBoundary>
                <RateLimitError
                  error={rateLimitError}
                  onApiKeyClick={() => {
                    // Navigate to search view where API key input is available
                    setCurrentView('search');
                  }}
                />
              </ErrorBoundary>
            ) : processingStars ? (
              <ErrorBoundary>
                <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-xl" />}>
                  <ProcessingStatus jobStatus={jobStatus} isRefreshing={isRefreshing} />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <ErrorBoundary>
                <Suspense fallback={<Skeleton className="h-[600px] w-full rounded-xl" />}>
                  <SearchInterface
                    onRefreshStars={refreshStars}
                    totalStars={totalStars}
                    apiKeyThreshold={apiKeyThreshold}
                    apiKey={apiKey}
                    onApiKeyChange={setApiKey}
                    isRefreshing={isRefreshing}
                  />
                </Suspense>
              </ErrorBoundary>
            )}
          </div>
        </GridBackground>
      </main>
      <Footer />
    </div>
  );
}
