import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { generateBaseMetadata } from "@/lib/metadata";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

// Generate metadata server-side only to avoid including in client bundle
export function generateMetadata() {
  return generateBaseMetadata();
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background antialiased", inter.className)}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
