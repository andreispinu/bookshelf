import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CATEGORIES } from '@/lib/categories'
import { LANGUAGES } from '@/lib/languages'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const formData = await request.formData()
  const coverImage = formData.get('coverImage') as File | null
  if (!coverImage) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const versoImage = formData.get('versoImage') as File | null

  const coverBuffer = Buffer.from(await coverImage.arrayBuffer())
  const coverMediaType = (coverImage.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

  const claudeContent: Array<Anthropic.ImageBlockParam | Anthropic.TextBlockParam> = []

  if (versoImage) {
    const versoBuffer = Buffer.from(await versoImage.arrayBuffer())
    const versoMediaType = (versoImage.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
    claudeContent.push(
      { type: 'image', source: { type: 'base64', media_type: coverMediaType, data: coverBuffer.toString('base64') } },
      { type: 'image', source: { type: 'base64', media_type: versoMediaType, data: versoBuffer.toString('base64') } },
      {
        type: 'text',
        text: `You are analyzing a book. The first image is the front cover, the second image is the back cover (verso).

Extract all available information from BOTH images:
- From front cover: title, author, publisher logo/name, edition
- From back cover: ISBN (usually on back as barcode), publisher, year, description/blurb (the marketing text on the back), category, language, price (ignore), any series information

The back cover blurb is extremely valuable — use it as the basis for the description field (summarize or use directly, max 100 words, written in the book's language).
ISBN from the barcode on the back cover is more reliable than anything on the front — prioritize it.

Return a JSON object with exactly these fields:
- title: the book title (string or null)
- author: the author name(s) (string or null)
- isbn: ISBN number from the barcode on the back cover, or elsewhere if visible (string or null)
- publisher: publisher name (string or null)
- year: publication year (string or null)
- category: pick exactly one from: ${CATEGORIES.join(', ')}. Return null if none fits.
- language: the language this book is written in. Pick from: ${LANGUAGES.join(', ')}. Return null if uncertain.
- description: summarize the back cover blurb in max 100 words in the book's language. If no blurb is visible, use your knowledge of the book. Return null if unavailable.

Do NOT return a cover_url field.
Return only a raw JSON object. No markdown, no code blocks, no explanation.`,
      },
    )
  } else {
    claudeContent.push(
      { type: 'image', source: { type: 'base64', media_type: coverMediaType, data: coverBuffer.toString('base64') } },
      {
        type: 'text',
        text: `This is a book cover image. Extract information and return a JSON object with exactly these fields:
- title: the book title (string or null)
- author: the author name(s) (string or null)
- isbn: ISBN number if visible (string or null)
- publisher: publisher name if visible (string or null)
- year: publication year if visible (string or null)
- category: pick exactly one from: ${CATEGORIES.join(', ')}. Return null if none fits.
- language: the language this book is written in. Pick from: ${LANGUAGES.join(', ')}. Detect from the cover text, title, and author. Return null if uncertain.
- description: what this book is about, its genre, and tone — based on your knowledge. Maximum 100 words. Write in the same language as the book if known, otherwise in English. Return null if you don't know this book.

Do NOT return a cover_url field — the user's photo will be used as the cover.

Return only a raw JSON object. No markdown, no code blocks, no explanation.`,
      },
    )
  }

  // Run Claude extraction and cover thumbnail generation in parallel
  const [messageResult, thumbnailResult] = await Promise.allSettled([
    anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: claudeContent }],
    }),
    // Always use front cover for thumbnail
    sharp(coverBuffer).resize({ width: 400, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer(),
  ])

  // Parse Claude response
  let extracted: Record<string, string | null> = {}
  if (messageResult.status === 'fulfilled') {
    const raw = messageResult.value.content[0].type === 'text'
      ? messageResult.value.content[0].text.trim()
      : ''
    try { extracted = JSON.parse(raw) } catch { /* extraction failed, use empty */ }
  }

  // Upload thumbnail to Supabase Storage
  let cover_url: string | null = null
  if (thumbnailResult.status === 'fulfilled') {
    const filename = `${user.id}/${Date.now()}.jpg`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('book-covers')
      .upload(filename, thumbnailResult.value, { contentType: 'image/jpeg', upsert: false })

    if (!uploadError) {
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('book-covers')
        .getPublicUrl(filename)
      cover_url = publicUrl
    }
  }

  // If Claude found nothing useful, fail loudly
  if (!extracted.title && !extracted.author) {
    return NextResponse.json({ error: 'Could not read book details from cover' }, { status: 422 })
  }

  // User's uploaded front cover photo always wins as the cover image
  extracted.cover_url = cover_url

  return NextResponse.json({ ...extracted })
}
