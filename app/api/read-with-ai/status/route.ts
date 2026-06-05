import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const readingId = req.nextUrl.searchParams.get('readingId')
  if (!readingId) return NextResponse.json({ error: 'Missing readingId' }, { status: 400 })

  const { data: reading } = await supabaseAdmin
    .from('reading_ai_books')
    .select('id, status')
    .eq('id', readingId)
    .eq('user_id', user.id)
    .single()

  if (!reading) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { count } = await supabaseAdmin
    .from('reading_ai_insights')
    .select('*', { count: 'exact', head: true })
    .eq('reading_id', readingId)
    .not('delivered_at', 'is', null)

  // Return the latest delivered insight so the client can show it immediately
  const { data: latestInsight } = (reading.status === 'active' || reading.status === 'completed')
    ? await supabaseAdmin
        .from('reading_ai_insights')
        .select('id, position, title, insight, extract, delivered_at, read_at')
        .eq('reading_id', readingId)
        .not('delivered_at', 'is', null)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  return NextResponse.json({
    status: reading.status,
    insightsCount: count ?? 0,
    latestInsight: latestInsight ?? null,
  })
}
