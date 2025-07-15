"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { forwardRef, useImperativeHandle, useRef, useState, useId } from "react";

interface ApiKeyInputProps {
    apiKey: string;
    required?: boolean;
    onApiKeyChange: (key: string) => void;
    apiKeyThreshold: number;
}

export interface ApiKeyInputRef {
    focusAndHighlight: () => void;
}

export const ApiKeyInput = forwardRef<ApiKeyInputRef, ApiKeyInputProps>(({
    apiKey,
    required = false,
    apiKeyThreshold,
    onApiKeyChange,
}, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isHighlighted, setIsHighlighted] = useState(false);
    const inputId = useId();
    const helpId = useId();
    const errorId = useId();

    useImperativeHandle(ref, () => ({
        focusAndHighlight: () => {
            if (inputRef.current) {
                inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                inputRef.current.focus();
                setIsHighlighted(true);
                setTimeout(() => setIsHighlighted(false), 3000);
            }
        }
    }));

    const hasError = required && !apiKey;
    const helpText = `OpenAI API key for calculating embeddings when refreshing stars. ${required ? 'Required for users with many stars.' : 'Optional but helps avoid rate limits.'}`;

    return (
        <div className={cn(
            "relative w-full transition-all duration-300",
            isHighlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg"
        )}>
            <Label htmlFor={inputId} className="sr-only">
                OpenAI API Key for refreshing stars {required ? "(required)" : "(optional)"}
            </Label>
            <Input
                id={inputId}
                ref={inputRef}
                type="password"
                autoComplete="off"
                autoSave="off"
                placeholder={required ? "OpenAI API Key (required)" : "OpenAI API Key (recommended)"}
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                className={cn(
                    "h-9 bg-background text-sm pr-10 transition-colors",
                    hasError && "border-amber-300 dark:border-amber-700 focus:border-amber-500 dark:focus:border-amber-400",
                    isHighlighted && "border-primary shadow-sm",
                    !hasError && !isHighlighted && "border-border focus:border-primary"
                )}
                aria-label={`OpenAI API Key for refreshing stars ${required ? "(required)" : "(recommended)"}`}
                aria-describedby={`${helpId} ${hasError ? errorId : ''}`}
                aria-invalid={hasError}
                aria-required={required}
            />

            {/* Error message for screen readers */}
            {hasError && (
                <div id={errorId} className="sr-only" aria-live="polite">
                    OpenAI API Key is required for refreshing stars when you have more than {apiKeyThreshold} stars
                </div>
            )}

            <div className="absolute right-1 top-0 bottom-0 flex items-center">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                                aria-label="OpenAI API Key for refreshing information"
                                aria-describedby={helpId}
                            >
                                <Info className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent id={helpId} role="tooltip" className="max-w-sm">
                            <p className="text-center">
                                {helpText}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
});

ApiKeyInput.displayName = "ApiKeyInput"; 