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

interface NavbarProps {
  currentView: 'home' | 'search';
  onNavigate: (view: 'home' | 'search') => void;
  totalStars: number;
}

export function Navbar({ currentView, onNavigate, totalStars }: NavbarProps) {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 select-none">
          <span className="font-bold sm:text-2xl text-[1.5rem]">starscout</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={currentView === 'home' ? 'default' : 'ghost'}
            size="sm"
            className="cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            <Home className="h-4 w-4" />
            <span className="sm:block hidden">Home</span>
          </Button>
          <Button
            variant={currentView === 'search' ? 'default' : 'ghost'}
            size="sm"
            className="cursor-pointer"
            onClick={() => onNavigate('search')}
          >
            <Search className="h-4 w-4" />
            <span className="sm:block hidden">Search</span>
          </Button>
        </div>
      </div>
      <div className="flex items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 p-3 mr-2 bg-primary/10 rounded-full cursor-pointer">
                <Star className="h-5 w-5" />
                <span className="text-sm text-muted-foreground">{totalStars}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {"Number of repositories you have starred"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative h-8 w-8 rounded-full cursor-pointer">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                <AvatarFallback>{session.user?.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="flex items-center">
              <span className="truncate">{session.user?.name}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 cursor-pointer focus:text-red-600"
              onClick={() => signOut()}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
} 