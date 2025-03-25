"use client";

import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ApiKeyInputProps {
    apiKey: string;
    required?: boolean;
    onApiKeyChange: (key: string) => void;
    apiKeyThreshold: number;
}

export function ApiKeyInput({
    apiKey,
    required = false,
    apiKeyThreshold,
    onApiKeyChange,
}: ApiKeyInputProps) {
    return (
        <div className="relative w-full">
            <Input
                type="password"
                autoComplete="off"
                autoSave="off"
                placeholder={"OpenAI API Key" + (required ? " (required)" : " (optional)")}
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                className={cn(
                    "h-9 bg-background text-sm pr-9",
                    required && !apiKey && "border-destructive"
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
} 