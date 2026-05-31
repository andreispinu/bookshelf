import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const q = request.nextUrl.searchParams.get('q') ?? ''
  if (!q.trim()) return NextResponse.json([])

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, created_at')
    .neq('id', user.id)
    .ilike('name', `%${q}%`)
    .limit(10)

  if (error) return NextResponse.json([], { status: 500 })
  return NextResponse.json(data)
}
