import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const formData = await request.formData()
  const image = formData.get('image') as File | null
  if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  // Resize to max 1024px to stay well within Anthropic's 5MB base64 limit
  const buffer = Buffer.from(await image.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mediaType = (image.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `This is a book cover image. Extract information from the cover and return a JSON object with exactly these fields:
- title: the book title (string or null)
- author: the author name(s) (string or null)
- isbn: ISBN number if visible (string or null)
- publisher: publisher name if visible (string or null)
- year: publication year if visible (string or null)
- description: a short description of this book — what it's about, its genre, and tone — based on your knowledge of the book. Maximum 100 words. If you don't know this book, return null.

Return only a raw JSON object. No markdown, no code blocks, no explanation.`,
          },
        ],
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  let extracted: Record<string, string | null>
  try {
    extracted = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Failed to parse extraction' }, { status: 422 })
  }

  return NextResponse.json(extracted)
}
