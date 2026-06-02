import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {},
  env: {
    NEXT_PUBLIC_BUILD_ID: new Date().toISOString().split('T')[0],
  },
};

export default withNextIntl(
  withPWA({
    dest: "public",
    cacheOnFrontEndNav: true,
    reloadOnOnline: true,
    disable: process.env.NODE_ENV === "development",
    workboxOptions: {
      runtimeCaching: [
        {
          // NetworkFirst for all runtime requests — always try network, fall back to cache only when offline
          urlPattern: /^https?.*/,
          handler: "NetworkFirst",
          options: {
            cacheName: "pages",
            networkTimeoutSeconds: 10,
            expiration: {
              maxEntries: 150,
              maxAgeSeconds: 24 * 60 * 60,
            },
          },
        },
      ],
    },
  })(nextConfig)
);
