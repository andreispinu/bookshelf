import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { invitationEmail } from '@/lib/email-templates'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { data: invitation } = await supabaseAdmin
    .from('invitations')
    .select('id, email, token, updated_at')
    .eq('id', id)
    .eq('inviter_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

  const inv = invitation as { id: string; email: string; token: string; updated_at: string }

  // 24-hour cooldown
  const hoursSinceLast = (Date.now() - new Date(inv.updated_at).getTime()) / (1000 * 60 * 60)
  if (hoursSinceLast < 24) {
    return NextResponse.json(
      { error: 'cooldown', hoursLeft: Math.ceil(24 - hoursSinceLast) },
      { status: 429 },
    )
  }

  await supabaseAdmin
    .from('invitations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id)

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  if (profile) {
    const { subject, html } = invitationEmail((profile as { name: string }).name, inv.token)
    sendEmail({ to: inv.email, subject, html }).catch(console.error)
  }

  return NextResponse.json({ resent: true })
}
