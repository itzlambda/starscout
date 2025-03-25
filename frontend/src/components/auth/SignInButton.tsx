"use client";

import { Button } from "@/components/ui/button";
import { GithubIcon } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";

export function SignInButton() {
  const { data: session } = useSession();

  if (session?.user) {
    return (
      <Button variant="outline" onClick={() => signOut()}>
        Sign Out
      </Button>
    );
  }

  return (
    <Button onClick={() => signIn("github")} className="gap-2">
      <GithubIcon className="h-5 w-5" />
      Sign in with GitHub
    </Button>
  );
} 