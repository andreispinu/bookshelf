// Canonical production origin. Production serves on www; the apex
// (bookshelf.name) 307-redirects to www, so every canonical / sitemap / OG /
// JSON-LD URL must use www to avoid pointing crawlers at a redirecting URL.
export const SITE_URL = 'https://www.bookshelf.name'
