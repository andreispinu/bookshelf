// SEO/GEO-friendly URL slugs for books.
//
// Book pages are addressed as `/catalog/<slug>-<uuid>` — a human- and
// crawler-readable slug built from title + author, with the full UUID appended
// so the book is always resolvable and old `/catalog/<uuid>` links still work
// (the uuid is extracted by regex). No DB column / migration needed.

// Romanian letters whose comma/cedilla forms don't decompose under NFKD.
const SPECIALS: Record<string, string> = {
  ă: 'a', â: 'a', î: 'i', ș: 's', ş: 's', ț: 't', ţ: 't', ğ: 'g', ı: 'i',
}

// Minimal Cyrillic (Russian) → Latin transliteration so Russian titles still
// produce a meaningful slug instead of being stripped to nothing.
const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export function slugify(input: string): string {
  const lower = (input || '').toLowerCase()
  let out = ''
  for (const ch of lower) {
    out += SPECIALS[ch] ?? CYRILLIC[ch] ?? ch
  }
  return out
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip remaining combining diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

// Pull the book UUID out of a route param (`slug-uuid` or a bare `uuid`).
export function extractBookId(param: string): string | null {
  const matches = (param || '').match(UUID_RE)
  return matches ? matches[matches.length - 1].toLowerCase() : null
}

// Canonical slug segment for a book: `<title-author>-<uuid>` (slug capped).
export function bookSlug(title: string, author: string, id: string, maxLen = 70): string {
  const base = slugify(`${title} ${author}`).slice(0, maxLen).replace(/-+$/, '')
  return base ? `${base}-${id}` : id
}

// Full canonical path for a book page.
export function bookPath(title: string, author: string, id: string): string {
  return `/catalog/${bookSlug(title, author, id)}`
}
