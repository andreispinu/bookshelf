import type { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'

const SITE_URL = 'https://bookshelf.name'

// Regenerate hourly so newly-public profiles get picked up.
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

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...profileUrls,
  ]
}
