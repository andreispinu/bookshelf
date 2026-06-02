import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'
import { CATEGORIES } from '@/lib/categories'
import { LANGUAGES } from '@/lib/languages'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function fetchGoogleBooksCover(
  isbn: string | null,
  title: string,
  author: string | null,
): Promise<string | null> {
  // Try ISBN first (most precise), then title+author
  const queries: string[] = []
  if (isbn) queries.push(`isbn:${isbn}`)
  queries.push(
    `intitle:${encodeURIComponent(title)}${author ? `+inauthor:${encodeURIComponent(author)}` : ''}`,
  )

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`,
      )
      if (!res.ok) continue
      const data = await res.json()
      const thumbnail: string | undefined =
        data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail
      if (!thumbnail) continue

      // Use HTTPS, higher zoom, remove decorative page-curl
      return thumbnail
        .replace('http://', 'https://')
        .replace('zoom=1', 'zoom=2')
        .replace('&edge=curl', '')
    } catch {
      continue
    }
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
    max_tokens: 768,
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

  // Fetch cover server-side from Google Books (reliable thumbnails, no 1×1 placeholders)
  const isbn = suggested.isbn?.replace(/[-\s]/g, '') ?? null
  const resolvedAuthor = suggested.author ?? (author?.trim() || null)
  suggested.cover_url = await fetchGoogleBooksCover(isbn, title.trim(), resolvedAuthor)

  console.log('[fill-book-title] suggested:', { ...suggested })

  return NextResponse.json({ suggested })
}
