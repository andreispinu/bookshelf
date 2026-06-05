import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import AdminSupportClient from './admin-support-client'
import AdminTabs from '../../admin-tabs'

export const revalidate = 0

export default async function AdminSupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: ticket } = await supabaseAdmin
    .from('support_tickets')
    .select(`
      id, type, subject, status, created_at, updated_at, user_id,
      profiles!support_tickets_user_id_fkey(id, name, avatar_url, first_name),
      support_replies(id, from_admin, content, read_at, created_at)
    `)
    .eq('id', id)
    .single()

  if (!ticket) notFound()

  const profile = ticket.profiles as unknown as { id: string; name: string; avatar_url: string | null; first_name: string | null } | null
  let userEmail = ''
  if (profile?.id) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id)
    userEmail = authUser.user?.email ?? ''
  }

  return (
    <>
    <AdminTabs />
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Link
          href="/admin/support"
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          ← All tickets
        </Link>
        <h1 className="text-xl font-bold text-stone-900 mt-2">{ticket.subject}</h1>
        <p className="text-sm text-stone-400 mt-0.5 capitalize">{ticket.type} ticket · #{ticket.id.slice(0, 8)}</p>
      </div>

      <AdminSupportClient
        ticketId={ticket.id}
        subject={ticket.subject}
        initialStatus={ticket.status as 'open' | 'in_progress' | 'resolved'}
        initialReplies={ticket.support_replies as { id: string; from_admin: boolean; content: string; read_at: string | null; created_at: string }[]}
        userName={profile?.name ?? 'Unknown'}
        userEmail={userEmail}
      />
    </div>
    </>
  )
}
