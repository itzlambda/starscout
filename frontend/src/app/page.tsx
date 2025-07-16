"use client";

import { useSession } from "next-auth/react";
import { useGithubStars } from "@/hooks/useGithubStars";
import { LandingContent } from "@/components/landing/LandingContent";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { GridBackground } from "@/components/ui/GridBackground";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { useState } from "react";
import type { Session } from "next-auth"
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { MaintenancePage } from "@/components/maintenance/MaintenancePage";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { SafePageContent } from "@/components/layout/SafePageContent";
import { useGithubStarsCount } from "@/hooks/useSwrApi";
import { useApiKeyThreshold } from "@/hooks/useAppSettings";
import { PageSkeleton } from "@/components/layout/PageSkeleton";

// Large components are now lazy loaded within SafePageContent

export default function Home() {
  const { data: session }: { data: Session | null } = useSession();
  const { isBackendHealthy } = useBackendHealth();
  const { processingStars, jobStatus, isRefreshing, rateLimitError, refreshStars } = useGithubStars();
  const [hasStartedProcessing, setHasStartedProcessing] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'search'>(hasStartedProcessing ? 'search' : 'home');
  const [apiKey, setApiKey] = useLocalStorage('openai_api_key', '');

  // Use SWR for caching API responses
  const { totalStars, isLoadingStars } = useGithubStarsCount(session?.accessToken);
  const { apiKeyThreshold } = useApiKeyThreshold();


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
        <GradientBackground className="flex-1 flex flex-col items-center justify-center px-4 pt-24 pb-4">
          <GridBackground className="max-w-4/5">
            <LandingContent />
          </GridBackground>
        </GradientBackground>
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
      <GradientBackground className="flex-1 flex flex-col items-center justify-center px-4 pt-24 pb-4">
        <GridBackground className="max-w-4xl">
          <div className="space-y-8">
            <SafePageContent
              currentView={currentView}
              rateLimitError={rateLimitError}
              processingStars={processingStars}
              jobStatus={jobStatus}
              onNavigateToSearch={() => handleNavigation('search')}
              onRefreshStars={refreshStars}
              totalStars={totalStars}
              apiKeyThreshold={apiKeyThreshold}
              apiKey={apiKey}
              onApiKeyChange={setApiKey}
              isRefreshing={isRefreshing}
              onSetCurrentView={setCurrentView}
            />
          </div>
        </GridBackground>
      </GradientBackground>
      <Footer />
    </div>
  );
}
