import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "starscout",
  description: "Search through your github stars using AI",
  metadataBase: new URL('https://starscout.xyz'),
  openGraph: {
    title: "starscout - AI-Powered GitHub Stars Search",
    description: "Search through your github stars using AI",
    type: "website",
    url: "https://starscout.xyz",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "starscout - AI-Powered GitHub Stars Search"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "starscout - AI-Powered GitHub Stars Search",
    description: "Search through your github stars using AI",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
};

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
