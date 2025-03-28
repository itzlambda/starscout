"use client";

import { useSession } from "next-auth/react";
import { useGithubStars } from "@/hooks/useGithubStars";
import { ProcessingStatus } from "@/components/github/ProcessingStatus";
import { SearchInterface } from "@/components/search/SearchInterface";
import { LandingContent } from "@/components/landing/LandingContent";
import { OnboardingContent } from "@/components/onboarding/OnboardingContent";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { GridBackground } from "@/components/ui/GridBackground";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Session } from "next-auth"
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { MaintenancePage } from "@/components/maintenance/MaintenancePage";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export default function Home() {
  const { data: session }: { data: Session | null } = useSession();
  const { isBackendHealthy } = useBackendHealth();
  const { processingStars, jobStatus, isRefreshing, refreshStars, startProcessing } = useGithubStars();
  const [totalStars, setTotalStars] = useState<number>(0);
  const [hasStartedProcessing, setHasStartedProcessing] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'search'>(hasStartedProcessing ? 'search' : 'home');
  const [isLoadingStars, setIsLoadingStars] = useState(true);
  const [apiKeyThreshold, setApiKeyThreshold] = useState(0);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${BACKEND_API_URL}/settings`);
        if (response.ok) {
          const data = await response.json();
          setApiKeyThreshold(data.api_key_star_threshold);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettings();
  }, []);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Save API key to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('openai_api_key', apiKey);
  }, [apiKey]);

  const fetchUserStars = useCallback(async () => {
    if (!session?.accessToken) return;

    setIsLoadingStars(true);
    try {
      const response = await fetch('https://api.github.com/user/starred?per_page=1', {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        }
      });

      if (response.ok) {
        const linkHeader = response.headers.get('Link');
        if (linkHeader) {
          const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
          if (match) {
            setTotalStars(parseInt(match[1]));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user stars:', error);
    } finally {
      setIsLoadingStars(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (session?.accessToken) {
      fetchUserStars();
    }
  }, [session?.accessToken, fetchUserStars]);


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
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar currentView={currentView} onNavigate={handleNavigation} totalStars={0} />
        <main className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-background via-background/95 to-background/90 px-4 pt-24 pb-4">
          <GridBackground className="max-w-4/5">
            <div className="space-y-8">
              <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
          </GridBackground>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar currentView={currentView} onNavigate={handleNavigation} totalStars={totalStars} />
      <main className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-background via-background/95 to-background/90 px-4 pt-24 pb-4">
        <GridBackground className="max-w-4xl">
          <div className="space-y-8">
            {currentView === 'home' ? (
              <OnboardingContent
                onStartProcessing={handleStartProcessing}
              />
            ) : processingStars ? (
              <ProcessingStatus jobStatus={jobStatus} isRefreshing={isRefreshing} />
            ) : (
              <SearchInterface
                onRefreshStars={refreshStars}
                totalStars={totalStars}
                apiKeyThreshold={apiKeyThreshold}
                apiKey={apiKey}
                onApiKeyChange={setApiKey}
              />
            )}
          </div>
        </GridBackground>
      </main>
      <Footer />
    </div>
  );
}
