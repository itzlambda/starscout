"use client";

import { RepositoryCard } from "@/components/repository/RepositoryCard";
import { Repository } from "@/types/github";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchResultsProps {
  repositories: Repository[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function SearchResults({
  repositories,
  isLoading = false,
  emptyMessage = "No repositories found",
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