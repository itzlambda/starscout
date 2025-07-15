"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useState, useId } from "react";
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
  const inputId = useId();
  const searchButtonId = useId();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disabled) {
      onSearch(query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled) {
      e.preventDefault();
      onSearch(query);
    }
  };

  const input = (
    <div className="w-full">
      <Label htmlFor={inputId} className="sr-only">
        Search for repositories
      </Label>
      <Input
        id={inputId}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pl-10 h-12 bg-background border-input w-full"
        disabled={disabled}
        aria-label="Search repositories"
        aria-describedby={disabled && disabledTooltip ? `${inputId}-help` : undefined}
        aria-invalid={disabled ? 'true' : 'false'}
        role="searchbox"
        autoComplete="off"
      />
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Repository search form"
    >
      <div className="relative">
        <Search
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground",
            disabled && "opacity-50"
          )}
          aria-hidden="true"
        />
        {disabled && disabledTooltip ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild className="w-full block">
                {input}
              </TooltipTrigger>
              <TooltipContent id={`${inputId}-help`}>
                <p>{disabledTooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : input}

        {/* Hidden submit button for screen readers */}
        <button
          id={searchButtonId}
          type="submit"
          className="sr-only"
          disabled={disabled}
          aria-label="Submit search"
        >
          Search
        </button>
      </div>
    </form>
  );
}