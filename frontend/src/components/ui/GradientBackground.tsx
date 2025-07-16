import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GradientBackgroundProps {
    children: ReactNode;
    className?: string;
}

/**
 * A reusable component that applies the standard gradient background pattern.
 * Replaces the repeated: bg-gradient-to-b from-background via-background/95 to-background/90
 */
export function GradientBackground({ children, className }: GradientBackgroundProps) {
    return (
        <div className={cn(
            "bg-gradient-to-b from-background via-background/95 to-background/90",
            className
        )}>
            {children}
        </div>
    );
} 