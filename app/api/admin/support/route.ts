import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/admin/support — list all tickets (admin only)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'sp_andrei@yahoo.com') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: tickets, error } = await supabaseAdmin
    .from('support_tickets')
    .select(`
      id, type, subject, status, created_at, updated_at, user_id,
      profiles!support_tickets_user_id_fkey(name, avatar_url),
      support_replies(id, from_admin, content, read_at, created_at)
    `)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ tickets: tickets ?? [] })
}
