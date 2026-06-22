import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import "./globals.css"
import { Toaster } from "@/components/ui/sonner";
import PwaUpdater from "./pwa-updater";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

// Inter (body / UI) and Playfair Display (headings). Both variable fonts —
// loading the full axis avoids faux-bold on font-medium/semibold UI text.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#2c1a0e",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://bookshelf.name"),
  title: {
    default: "BookShelf — Your personal library",
    template: "BookShelf — %s | Your personal library",
  },
  description: "Your personal lending library",
  applicationName: "BookShelf",
  manifest: "/manifest.json",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BookShelf",
  },
  icons: {
    icon: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "BookShelf",
    url: "https://bookshelf.name",
    title: "BookShelf — Your personal library, shared with friends",
    description:
      "A free app to catalogue the books you own, lend and borrow with friends, and track your reading.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BookShelf — Your personal library, shared with friends",
    description:
      "A free app to catalogue the books you own, lend and borrow with friends, and track your reading.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${playfair.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <head>
        {/* Warm up the Supabase Storage origin early — book covers (the landing
            LCP element) are served from there, so opening the connection before
            render shaves the TLS/DNS handshake off image load time. */}
        <link rel="preconnect" href="https://njyugygdhkegagnapbcy.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://njyugygdhkegagnapbcy.supabase.co" />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster position="bottom-center" />
          <PwaUpdater />
        </NextIntlClientProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
