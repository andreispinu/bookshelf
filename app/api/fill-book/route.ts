import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'
import { CATEGORIES } from '@/lib/categories'
import { LANGUAGES } from '@/lib/languages'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { bookId } = await request.json()
  if (!bookId) return NextResponse.json({ error: 'bookId required' }, { status: 400 })

  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('user_id', user.id)
    .single()

  if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

  const langContext = book.language
    ? `Write the description in ${book.language}.`
    : 'Write the description in the language of the book, or in English if unknown.'

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 768,
    messages: [{
      role: 'user',
      content: `You are a book knowledge assistant. Given this book, return a JSON object with all fields you can confidently provide.

Title: ${book.title}
Author: ${book.author}
${book.isbn ? `ISBN: ${book.isbn}` : ''}
${book.language ? `Language: ${book.language}` : ''}

Return a JSON object with exactly these fields (null for anything you are not confident about):
- isbn: ISBN-13 number (string or null)
- publisher: publisher name (string or null)
- year: 4-digit publication year as a string (string or null)
- category: exactly one of: ${CATEGORIES.join(', ')}. (string or null)
- language: language the book is written in, exactly one of: ${LANGUAGES.join(', ')}. (string or null)
- description: what this book is about, its genre and tone. Maximum 100 words. ${langContext} (string or null)
- cover_url: a reliable public cover image URL. If you know the ISBN, use OpenLibrary: https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg. Only provide a URL if you are highly confident it is correct and accessible. (string or null)

Return ONLY a raw JSON object. No markdown, no code blocks, no explanation.`,
    }],
  })

  let suggested: Record<string, string | null> = {}
  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  try { suggested = JSON.parse(raw) } catch { /* ignore */ }

  // If we have an ISBN (from book or from Claude's response), always prefer OpenLibrary
  const isbn = (book.isbn || suggested.isbn)?.replace(/[-\s]/g, '')
  if (isbn) {
    suggested.cover_url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  }

  return NextResponse.json({ suggested })
}
