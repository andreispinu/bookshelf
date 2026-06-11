import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import "./globals.css"
import { Toaster } from "@/components/ui/sonner";
import PwaUpdater from "./pwa-updater";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#292524",
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
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
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
