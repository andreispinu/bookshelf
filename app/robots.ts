import type { MetadataRoute } from 'next'

const SITE_URL = 'https://bookshelf.name'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api',
          '/books',
          '/friends',
          '/loans',
          '/messages',
          '/feed',
          '/support',
          '/wishlist',
          '/profile',
          '/subscribe',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
