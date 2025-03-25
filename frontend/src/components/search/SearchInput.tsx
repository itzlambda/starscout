"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SearchInputProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledTooltip?: string;
}

export function SearchInput({
  onSearch,
  placeholder = "Search repositories...",
  disabled = false,
  disabledTooltip,
}: SearchInputProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disabled) {
      onSearch(query);
    }
  };

  const input = (
    <div className="w-full">
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 h-12 bg-background border-input w-full"
        disabled={disabled}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative">
        <Search className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground",
          disabled && "opacity-50"
        )} />
        {disabled && disabledTooltip ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild className="w-full block">
                {input}
              </TooltipTrigger>
              <TooltipContent>
                <p>{disabledTooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : input}
      </div>
    </form>
  );
}