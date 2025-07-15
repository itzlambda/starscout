"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from 'swr';
import { swrConfig } from '@/lib/swr-config';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig value={swrConfig}>
        {children}
      </SWRConfig>
    </SessionProvider>
  );
} 