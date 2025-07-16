"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Search } from 'lucide-react';

interface OnboardingContentProps {
  onNavigateToSearch: () => void;
  apiKeyThreshold: number;
}

export function OnboardingContent({ onNavigateToSearch, apiKeyThreshold }: OnboardingContentProps) {
  const handleStart = () => {
    onNavigateToSearch();
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Discover Your GitHub Stars
            </CardTitle>
            <CardDescription>
              Unlock the full potential of your GitHub stars with AI-powered search
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Star className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Your Personal Code Library</h3>
                  <p className="text-sm text-muted-foreground">
                    Transform your GitHub stars into a searchable knowledge base using AI-powered semantic embeddings
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Search className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Search Like You Think</h3>
                  <p className="text-sm text-muted-foreground">
                    Find repositories by describing what you need in plain English - no more digging through old bookmarks
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20" />
                <path d="M2 12h20" />
                <path d="m12 2 4 4" />
                <path d="m12 2-4 4" />
                <path d="m12 22-4-4" />
                <path d="m12 22 4-4" />
              </svg>
              How It Works
            </CardTitle>
            <CardDescription>
              Understanding the technology behind your semantic star search
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Star className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Reading Your Stars</h3>
                  <p className="text-sm text-muted-foreground">
                    We only access your public GitHub stars - the repositories you&apos;ve starred. This is public information that anyone can see on your GitHub profile.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.29 7 12 12 20.71 7" />
                    <line x1="12" y1="22" x2="12" y2="12" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Creating Embeddings</h3>
                  <p className="text-sm text-muted-foreground">
                    For each starred repository, we generate an embedding vector - a mathematical representation that captures the repository&apos;s content and purpose. If another user has already starred the same repository, we reuse the existing embedding to optimize processing.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Search className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Semantic Search</h3>
                  <p className="text-sm text-muted-foreground">
                    When you search, we convert your query into the same vector space and find repositories with similar embeddings, enabling natural language search through your stars.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="8" />
              </svg>
              Things to Know
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">API Key Requirement</h3>
                  <p className="text-sm text-muted-foreground">
                    To prevent abuse, users with more than {apiKeyThreshold.toLocaleString()} GitHub stars will need to provide their own OpenAI API key.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Server-Side Processing</h3>
                  <p className="text-sm text-muted-foreground">
                    Since we cache repo embedding vectors, API keys must be sent to our backend server for processing (this can&apos;t be done client-side). We never store any API keys, but we recommend revoking the key once you&apos;ve finished indexing your stars.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ready to Search?</CardTitle>
            <CardDescription>
              Go to the search interface to start exploring your starred repositories.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={handleStart}
              className="w-full"
            >
              Go to Search
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 