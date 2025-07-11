"use client";

import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";

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

    return (
        <div className={cn(
            "relative w-full transition-all duration-300",
            isHighlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-md"
        )}>
            <Input
                ref={inputRef}
                type="password"
                autoComplete="off"
                autoSave="off"
                placeholder={"OpenAI API Key" + (required ? " (required)" : " (optional)")}
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                className={cn(
                    "h-9 bg-background text-sm pr-9",
                    required && !apiKey && "border-destructive",
                    isHighlighted && "border-primary"
                )}
            />
            <div className="absolute right-1 top-0 bottom-0 flex items-center">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                className="h-7 w-7 cursor-pointer"
                            >
                                <Info className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-center">
                                OpenAI API key is used to calculate embeddings for the repositories and search query.
                                <br />
                                Even though its not stored on our servers, we suggest revoking it after use.
                                <br />
                                <br />
                                It is required if you have more than {apiKeyThreshold} stars.
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
});

ApiKeyInput.displayName = "ApiKeyInput"; 