import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton component that matches the RepositoryCard structure
 * Provides a realistic loading placeholder with proper spacing and proportions
 */
export function RepositoryCardSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    {/* Avatar skeleton */}
                    <Skeleton className="h-6 w-6 rounded-full" />
                    {/* Repository name skeleton */}
                    <Skeleton className="h-5 w-48" />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Description skeleton - varying length for realism */}
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
                {/* Topics skeleton */}
                <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Multiple repository skeletons for search results loading
 */
export function RepositoryListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <RepositoryCardSkeleton key={i} />
            ))}
        </div>
    );
} 