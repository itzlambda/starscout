"use client";

import { RepositoryCard } from "@/components/repository/RepositoryCard";
import { Repository } from "@/types/github";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, Key } from "lucide-react";

interface SearchResultsProps {
  repositories: Repository[];
  isLoading?: boolean;
  emptyMessage?: string;
  error?: string | null;
  onApiKeyClick?: () => void;
}

export function SearchResults({
  repositories,
  isLoading = false,
  emptyMessage = "No repositories found",
  error = null,
  onApiKeyClick,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[180px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    const isApiKeyError = error.toLowerCase().includes('api key');

    return (
      <div className="flex h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-destructive/50 bg-destructive/5 text-destructive">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="text-center max-w-md mb-4 text-sm leading-relaxed">{error}</p>
        {isApiKeyError && onApiKeyClick && (
          <Button
            onClick={onApiKeyClick}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Key className="h-4 w-4" />
            Update API Key
          </Button>
        )}
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {repositories.map((repo) => (
        <RepositoryCard key={repo.id} repository={repo} />
      ))}
    </div>
  );
} 