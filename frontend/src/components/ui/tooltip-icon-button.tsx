"use client";

import { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { VariantProps } from 'class-variance-authority';

interface TooltipIconButtonProps extends Omit<React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>, 'children'> {
    /** The Lucide icon component to display */
    icon: LucideIcon;
    /** Tooltip content to show on hover */
    tooltip: string;
    /** Additional className for the tooltip content */
    tooltipClassName?: string;
    /** ARIA label for accessibility */
    ariaLabel?: string;
    /** Icon size classes (default: "h-4 w-4") */
    iconSize?: string;
}

/**
 * A reusable component that combines Button + Icon + Tooltip.
 * Eliminates the repeated pattern of TooltipProvider > Tooltip > TooltipTrigger > Button > Icon.
 */
export const TooltipIconButton = forwardRef<HTMLButtonElement, TooltipIconButtonProps>(
    ({
        icon: Icon,
        tooltip,
        tooltipClassName,
        ariaLabel,
        iconSize = "h-4 w-4",
        className,
        variant = "ghost",
        size = "icon",
        ...props
    }, ref) => {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            ref={ref}
                            variant={variant}
                            size={size}
                            className={cn("cursor-pointer", className)}
                            aria-label={ariaLabel || tooltip}
                            {...props}
                        >
                            <Icon className={cn(iconSize)} aria-hidden="true" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent className={tooltipClassName} role="tooltip">
                        <p>{tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
);

TooltipIconButton.displayName = "TooltipIconButton"; 