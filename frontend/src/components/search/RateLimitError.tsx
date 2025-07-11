"use client";

import { AlertTriangle, Clock, Key } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RateLimitError as RateLimitErrorType } from '@/types/github';

interface RateLimitErrorProps {
    error: RateLimitErrorType;
    onApiKeyClick?: () => void;
}

export function RateLimitError({ error, onApiKeyClick }: RateLimitErrorProps) {
    const formatRetryTime = (seconds: number) => {
        if (seconds < 60) return `${seconds} seconds`;
        if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutes`;
        return `${Math.ceil(seconds / 3600)} hours`;
    };

    return (
        <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 rounded-full bg-destructive/10 p-4">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>

                <h3 className="mb-2 text-lg font-semibold text-destructive">
                    Rate Limit Exceeded
                </h3>

                <p className="mb-4 text-sm text-muted-foreground max-w-md">
                    {error.message}
                </p>

                {error.retryAfter && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                            Try again in {formatRetryTime(error.retryAfter)}
                        </span>
                    </div>
                )}

                <div className="flex flex-col gap-3 items-center">
                    <p className="text-sm text-muted-foreground">
                        Avoid rate limits by using your own OpenAI API key
                    </p>

                    {onApiKeyClick && (
                        <Button
                            onClick={onApiKeyClick}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <Key className="h-4 w-4" />
                            Enter Your API Key
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
} 