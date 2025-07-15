"use client";

import { signOut, useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Home, Search, Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useId } from "react";

interface NavbarProps {
  currentView: 'home' | 'search';
  onNavigate: (view: 'home' | 'search') => void;
  totalStars: number;
}

export function Navbar({ currentView, onNavigate, totalStars }: NavbarProps) {
  const { data: session } = useSession();
  const navId = useId();
  const starCountId = useId();

  if (!session) return null;

  return (
    <nav
      id={navId}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 select-none">
          <h1 className="font-bold sm:text-2xl text-[1.5rem]">starscout</h1>
        </div>
        <div className="flex items-center gap-2" role="group" aria-label="Page navigation">
          <Button
            variant={currentView === 'home' ? 'default' : 'ghost'}
            size="sm"
            className="cursor-pointer"
            onClick={() => onNavigate('home')}
            aria-current={currentView === 'home' ? 'page' : undefined}
            aria-label="Navigate to home page"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span className="sm:block hidden">Home</span>
          </Button>
          <Button
            variant={currentView === 'search' ? 'default' : 'ghost'}
            size="sm"
            className="cursor-pointer"
            onClick={() => onNavigate('search')}
            aria-current={currentView === 'search' ? 'page' : undefined}
            aria-label="Navigate to search page"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="sm:block hidden">Search</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center" role="toolbar" aria-label="User information and actions">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex items-center gap-2 p-3 mr-2 bg-primary/10 rounded-full"
                role="status"
                aria-live="polite"
                aria-labelledby={starCountId}
              >
                <Star className="h-5 w-5" aria-hidden="true" />
                <span
                  id={starCountId}
                  className="text-sm text-muted-foreground"
                  aria-label={`${totalStars} starred repositories`}
                >
                  {totalStars}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent role="tooltip">
              <p>Number of repositories you have starred</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative h-8 w-8 rounded-full cursor-pointer"
              aria-label={`User menu for ${session.user?.name || 'User'}`}
              aria-haspopup="menu"
              aria-expanded="false"
            >
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage
                  src={session.user?.image || ""}
                  alt={`${session.user?.name || 'User'} profile picture`}
                />
                <AvatarFallback aria-label={`${session.user?.name || 'User'} initials`}>
                  {session.user?.name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" role="menu">
            <DropdownMenuItem className="flex items-center" role="menuitem">
              <span className="truncate" aria-label={`Signed in as ${session.user?.name}`}>
                {session.user?.name}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 cursor-pointer focus:text-red-600"
              onClick={() => signOut()}
              role="menuitem"
              aria-label="Sign out of your account"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
} 