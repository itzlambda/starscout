import Link from 'next/link';

export function Footer() {
  return (
    <footer className="sticky bottom-0 w-full py-4 text-center text-sm text-muted-foreground bg-background/80 backdrop-blur-sm border-t border-border/40">
      <p>
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