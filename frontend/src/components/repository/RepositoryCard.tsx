"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Repository } from "@/types/github";

interface RepositoryCardProps {
    repository: Repository;
}

export function RepositoryCard({ repository }: RepositoryCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={repository.owner.avatarUrl} />
                        <AvatarFallback>{repository.owner.login[0]}</AvatarFallback>
                    </Avatar>
                    <a
                        href={repository.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                    >
                        {repository.owner.login}/{repository.name}
                    </a>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {repository.description && <p>{repository.description}</p>}
                <div className="flex flex-wrap gap-2">
                    {repository.topics.map((topic) => (
                        <Badge key={topic} variant="secondary">
                            {topic}
                        </Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
} 