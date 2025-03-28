import Link from 'next/link';
import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="sticky bottom-0 w-full py-4 px-4 flex items-center text-sm text-muted-foreground bg-background/80 backdrop-blur-sm border-t border-border/40">
      <Link
        href="https://github.com/itzlambda/starscout"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-primary transition-colors flex items-center gap-2"
      >
        <Github className="h-4 w-4" />
      </Link>
      <p className="flex-1 text-center">
        Built by {' '}
        <Link
          href="https://twitter.com/itzlambda"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          @itzlambda
        </Link>
      </p>
    </footer>
  );
} 