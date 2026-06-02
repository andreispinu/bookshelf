import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CATEGORIES } from '@/lib/categories'
import { LANGUAGES } from '@/lib/languages'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Check whether an OpenLibrary URL has a real cover.
// OpenLibrary returns a 1×1 GIF (~35 bytes) for missing covers — real covers are >500 bytes.
async function openLibraryHasCover(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    if (!res.ok) return false
    const len = res.headers.get('content-length')
    return len ? parseInt(len, 10) > 500 : false
  } catch {
    return false
  }
}

// Download an image URL, resize with sharp, upload to Supabase Storage, return public URL.
// Validates Content-Type starts with "image/" before uploading.
async function downloadAndStore(url: string, userId: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.startsWith('image/')) return null

    const buffer = Buffer.from(await res.arrayBuffer())
    const resized = await sharp(buffer)
      .resize({ width: 600, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()

    const filename = `${userId}/ai-${Date.now()}.jpg`
    const { error } = await supabaseAdmin.storage
      .from('book-covers')
      .upload(filename, resized, { contentType: 'image/jpeg', upsert: false })
    if (error) return null

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('book-covers')
      .getPublicUrl(filename)
    return publicUrl
  } catch {
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
  // 1. OpenLibrary by ISBN
  if (isbn) {
    const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
    if (await openLibraryHasCover(url)) {
      const stored = await downloadAndStore(url, userId)
      if (stored) return stored
    }
  }

  // 2. OpenLibrary by title
  const titleUrl = `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-L.jpg`
  if (await openLibraryHasCover(titleUrl)) {
    const stored = await downloadAndStore(titleUrl, userId)
    if (stored) return stored
  }

  // 3. Google Books API — download & re-upload for permanence
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
        const stored = await downloadAndStore(cleanUrl, userId)
        if (stored) return stored
      }
    }
  } catch { /* continue */ }

  // 4. Claude's suggested cover URL (only if it passes image validation)
  if (claudeCoverUrl) {
    const stored = await downloadAndStore(claudeCoverUrl, userId)
    if (stored) return stored
  }

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

  // Resolve cover through the priority chain; always store in Supabase
  suggested.cover_url = await resolveCover(
    isbn,
    title.trim(),
    resolvedAuthor,
    suggested.cover_url ?? null,
    user.id,
  )

  console.log('[fill-book-title] isbn:', isbn, 'cover_url:', suggested.cover_url)

  return NextResponse.json({ suggested })
}
