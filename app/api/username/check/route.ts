import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')?.toLowerCase()
  if (!username) return NextResponse.json({ available: false })

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  return NextResponse.json({ available: !data })
}
