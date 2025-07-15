import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the main page while loading stars count and initial data
 * Provides a realistic placeholder that matches the page structure
 */
export function PageSkeleton() {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Navbar skeleton */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16 bg-background/95 backdrop-blur border-b border-border">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <h1 className="font-bold sm:text-2xl text-[1.5rem]">starscout</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-16" />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Star count skeleton */}
                    <div className="flex items-center gap-2 p-3 mr-2 bg-primary/10 rounded-full">
                        <Skeleton className="h-5 w-5" />
                        <Skeleton className="h-4 w-8" />
                    </div>
                    {/* User avatar skeleton */}
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </nav>

            {/* Main content skeleton */}
            <main className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-background via-background/95 to-background/90 px-4 pt-24 pb-4">
                <div className="w-full max-w-4xl">
                    <div className="space-y-8">
                        {/* Content area skeleton */}
                        <Skeleton className="h-[400px] w-full rounded-xl" />
                    </div>
                </div>
            </main>

            {/* Footer placeholder */}
            <div className="h-16 border-t border-border" />
        </div>
    );
}

/**
 * Skeleton for settings loading state
 */
export function SettingsSkeleton() {
    return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-10" />
        </div>
    );
}

/**
 * Skeleton for onboarding content
 */
export function OnboardingSkeleton() {
    return (
        <div className="space-y-8">
            <div className="grid gap-6">
                {/* Main card skeleton */}
                <div className="p-6 border rounded-lg space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-64" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>

                {/* Features grid skeleton */}
                <div className="grid md:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-4 border rounded-lg space-y-3">
                            <Skeleton className="h-5 w-5" />
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 