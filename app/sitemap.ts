import type { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAllBooksForSitemap } from '@/lib/db/books'
import { SITE_URL } from '@/lib/site'
import { bookPath } from '@/lib/slug'

// Regenerate hourly so newly-public profiles and books get picked up.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Public profiles: anything not 'private' and with a username set.
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('username, created_at')
    .neq('profile_visibility', 'private')
    .not('username', 'is', null)

  const profileUrls: MetadataRoute.Sitemap = (profiles ?? []).map((p) => ({
    url: `${SITE_URL}/${p.username}`,
    lastModified: p.created_at ? new Date(p.created_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  // Every book gets its own public catalogue page.
  const books = await getAllBooksForSitemap()
  const bookUrls: MetadataRoute.Sitemap = books.map((b) => ({
    url: `${SITE_URL}${bookPath(b.title, b.author, b.id)}`,
    lastModified: b.created_at ? new Date(b.created_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/catalog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...profileUrls,
    ...bookUrls,
  ]
}
