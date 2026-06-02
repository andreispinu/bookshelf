import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CATEGORIES } from '@/lib/categories'
import { LANGUAGES } from '@/lib/languages'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Download an image URL, validate it is a real image, resize with sharp,
 * upload to Supabase Storage, and return the public URL.
 *
 * @param minBytes - reject images smaller than this (used to filter OpenLibrary's
 *   1×1 placeholder GIF which is ~35 bytes; real covers are tens of KB).
 */
async function downloadAndStore(
  url: string,
  userId: string,
  minBytes = 0,
): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null

    const ct = res.headers.get('content-type') ?? ''
    if (!ct.startsWith('image/')) return null

    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < minBytes) return null   // reject tiny placeholders

    const resized = await sharp(buffer)
      .resize({ width: 600, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()

    const filename = `${userId}/ai-${Date.now()}.jpg`
    const { error } = await supabaseAdmin.storage
      .from('book-covers')
      .upload(filename, resized, { contentType: 'image/jpeg', upsert: false })
    if (error) {
      console.error('[fill-book-title] storage upload error:', error.message)
      return null
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('book-covers')
      .getPublicUrl(filename)
    return publicUrl
  } catch (err) {
    console.error('[fill-book-title] downloadAndStore error:', err)
    return null
  }
}

async function resolveCover(
  isbn: string | null,
  title: string,
  author: string | null,
  claudeCoverUrl: string | null,
  userId: string,
): Promise<string | null> {
  // 1. OpenLibrary by ISBN — minBytes=1000 rejects the 1×1 placeholder GIF (~35 bytes)
  if (isbn) {
    const stored = await downloadAndStore(
      `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
      userId,
      1000,
    )
    if (stored) { console.log('[fill-book-title] cover from OpenLibrary/ISBN'); return stored }
  }

  // 2. OpenLibrary by title
  const stored2 = await downloadAndStore(
    `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-L.jpg`,
    userId,
    1000,
  )
  if (stored2) { console.log('[fill-book-title] cover from OpenLibrary/title'); return stored2 }

  // 3. Google Books API — no API key required for basic queries
  try {
    const q = `intitle:${encodeURIComponent(title)}${author ? `+inauthor:${encodeURIComponent(author)}` : ''}`
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`)
    if (res.ok) {
      const data = await res.json()
      const thumbnail: string | undefined = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail
      if (thumbnail) {
        const cleanUrl = thumbnail
          .replace('http://', 'https://')
          .replace('zoom=1', 'zoom=3')
          .replace('&edge=curl', '')
        const stored3 = await downloadAndStore(cleanUrl, userId)
        if (stored3) { console.log('[fill-book-title] cover from Google Books'); return stored3 }
      }
    }
  } catch (err) {
    console.error('[fill-book-title] Google Books error:', err)
  }

  // 4. Claude's suggested cover URL (validated by Content-Type check inside downloadAndStore)
  if (claudeCoverUrl) {
    const stored4 = await downloadAndStore(claudeCoverUrl, userId)
    if (stored4) { console.log('[fill-book-title] cover from Claude hint'); return stored4 }
  }

  console.log('[fill-book-title] no cover found')
  return null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { title, author } = await request.json()
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 900,
    messages: [{
      role: 'user',
      content: `You are a book knowledge assistant. Given a book title (and optionally author), return a JSON object with all fields you can confidently provide.

Title: ${title.trim()}
${author?.trim() ? `Author: ${author.trim()}` : ''}

If you cannot identify this as a specific real book with high confidence, return {"error": "not_found"}.
If the title is too short or ambiguous to identify a specific book, return {"error": "ambiguous"}.

Otherwise return a JSON object with exactly these fields (null for anything you are not confident about):
- author: full author name (string or null)
- isbn: ISBN-13 number, no dashes (string or null)
- publisher: publisher name (string or null)
- year: 4-digit first publication year as a string (string or null)
- category: exactly one of: ${CATEGORIES.join(', ')}. (string or null)
- language: language the book is written in, exactly one of: ${LANGUAGES.join(', ')}. (string or null)
- description: what this book is about, its genre and tone. Maximum 100 words, written in the book's language. (string or null)
- cover_url: if you know a reliable direct image URL for this book cover (ending in .jpg or .png) from a publisher, archive, or well-known image host, return it. Otherwise return null. (string or null)

Return ONLY a raw JSON object. No markdown, no code blocks, no explanation.`,
    }],
  })

  let suggested: Record<string, string | null> = {}
  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  try { suggested = JSON.parse(raw) } catch {
    return NextResponse.json({ error: 'parse_error' }, { status: 500 })
  }

  if (suggested.error === 'not_found') return NextResponse.json({ error: 'not_found' })
  if (suggested.error === 'ambiguous') return NextResponse.json({ error: 'ambiguous' })

  const isbn = suggested.isbn?.replace(/[-\s]/g, '') ?? null
  const resolvedAuthor = suggested.author ?? (author?.trim() || null)

  suggested.cover_url = await resolveCover(
    isbn,
    title.trim(),
    resolvedAuthor,
    suggested.cover_url ?? null,
    user.id,
  )

  console.log('[fill-book-title] result — isbn:', isbn, 'cover_url:', suggested.cover_url)

  return NextResponse.json({ suggested })
}
