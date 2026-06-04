import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { readingId, bookId } = await req.json()
  if (!readingId || !bookId) {
    return NextResponse.json({ error: 'Missing readingId or bookId' }, { status: 400 })
  }

  // Verify ownership and current status
  const { data: reading } = await supabaseAdmin
    .from('reading_ai_books')
    .select('id, status')
    .eq('id', readingId)
    .eq('user_id', user.id)
    .single()

  if (!reading) return NextResponse.json({ error: 'Reading not found' }, { status: 404 })
  if (reading.status !== 'pending') {
    return NextResponse.json({ error: 'Insights already generated' }, { status: 400 })
  }

  // Fetch book details
  const { data: book } = await supabaseAdmin
    .from('books')
    .select('title, author')
    .eq('id', bookId)
    .single()

  if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

  // Mark as generating
  await supabaseAdmin
    .from('reading_ai_books')
    .update({ status: 'generating' })
    .eq('id', readingId)

  try {
    const prompt = `You are an expert literary analyst. For the book "${book.title}" by "${book.author}", generate between 10 and 20 key insights that a reader would find valuable.

For each insight provide:
1. A short compelling title (5-8 words)
2. The insight itself (2-4 sentences explaining the concept, lesson, or idea)
3. A relevant extract or quote from the book that illustrates this insight (1-3 sentences, use actual text from the book if known, otherwise paraphrase in the author's style)

Return as a JSON array only, no other text: [{ "title": "...", "insight": "...", "extract": "..." }]

Focus on: key ideas, life lessons, memorable concepts, surprising facts, actionable takeaways.
Make each insight standalone and valuable on its own.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON array from response (handles code blocks)
    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array in Claude response')

    const parsed: { title: string; insight: string; extract: string }[] = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Invalid insights array')

    const insights = parsed.slice(0, 20)
    const now = new Date().toISOString()

    await supabaseAdmin.from('reading_ai_insights').insert(
      insights.map((ins, i) => ({
        reading_id: readingId,
        user_id: user.id,
        book_id: bookId,
        position: i + 1,
        title: String(ins.title ?? '').trim(),
        insight: String(ins.insight ?? '').trim(),
        extract: String(ins.extract ?? '').trim(),
        delivered_at: i === 0 ? now : null, // Deliver the first insight immediately
      })),
    )

    await supabaseAdmin
      .from('reading_ai_books')
      .update({ status: 'active', started_at: now })
      .eq('id', readingId)

    return NextResponse.json({ success: true, total: insights.length })
  } catch (err) {
    console.error('read-with-ai generate error:', err)
    // Revert to pending so the user can retry
    await supabaseAdmin
      .from('reading_ai_books')
      .update({ status: 'pending' })
      .eq('id', readingId)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
