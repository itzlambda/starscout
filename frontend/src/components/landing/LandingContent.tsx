import { SignInButton } from "@/components/auth/SignInButton";

export function LandingContent() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center space-y-8 text-center">
      <div className="space-y-4">
        <h1 className="text-8xl font-bold tracking-tight p-10">
          starscout
        </h1>
        <p className="mx-auto max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
          Search through your GitHub stars with AI-powered search.
        </p>
      </div>
      <div className="space-y-4">
        <SignInButton />
        <p className="text-sm text-muted-foreground">
          Read only permissions to your github account is required to read your stars.
        </p>
      </div>
    </div>
  );
} 