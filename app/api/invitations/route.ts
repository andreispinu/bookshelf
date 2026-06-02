import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { invitationEmail } from '@/lib/email-templates'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const normalizedEmail = email.trim().toLowerCase()

  // Check if email already exists in auth.users
  const { data: existingAuthUser } = await supabaseAdmin
    .schema('auth')
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingAuthUser) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, name, avatar_url')
      .eq('id', (existingAuthUser as { id: string }).id)
      .single()
    return NextResponse.json({ exists: true, profile })
  }

  // Get inviter's name
  const { data: inviterProfile } = await supabaseAdmin
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  if (!inviterProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Check if already invited
  const { data: existing } = await supabaseAdmin
    .from('invitations')
    .select('id')
    .eq('inviter_id', user.id)
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existing) return NextResponse.json({ alreadyInvited: true })

  // Insert invitation
  const { data: invitation, error: insertError } = await supabaseAdmin
    .from('invitations')
    .insert({ inviter_id: user.id, email: normalizedEmail })
    .select('id, token')
    .single()

  if (insertError || !invitation) {
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }

  // Send email (fire-and-forget)
  const { subject, html } = invitationEmail(inviterProfile.name, (invitation as { id: string; token: string }).token)
  sendEmail({ to: normalizedEmail, subject, html }).catch(console.error)

  return NextResponse.json({ sent: true, id: (invitation as { id: string; token: string }).id })
}
