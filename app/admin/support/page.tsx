import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'
import AdminTabs from '../admin-tabs'

export const revalidate = 0

type Ticket = {
  id: string
  type: string
  subject: string
  status: string
  created_at: string
  updated_at: string
  user_id: string
  profiles: { name: string; avatar_url: string | null } | null
  support_replies: { id: string; from_admin: boolean; read_at: string | null }[]
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase() || '?'
}

function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function StatusBadge({ status }: { status: string }) {
  const label = status === 'open' ? 'Open' : status === 'in_progress' ? 'In progress' : 'Resolved'
  const cls = status === 'resolved'
    ? 'bg-green-100 text-green-700'
    : status === 'in_progress'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-stone-100 text-stone-600'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
}

export default async function AdminSupportPage() {
  const { data: tickets } = await supabaseAdmin
    .from('support_tickets')
    .select(`
      id, type, subject, status, created_at, updated_at, user_id,
      profiles!support_tickets_user_id_fkey(name, avatar_url),
      support_replies(id, from_admin, read_at)
    `)
    .order('updated_at', { ascending: false })

  const allTickets = (tickets ?? []) as unknown as Ticket[]
  const open = allTickets.filter(t => t.status !== 'resolved')
  const resolved = allTickets.filter(t => t.status === 'resolved')

  return (
    <>
    <AdminTabs />
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Support</h1>
          <p className="text-sm text-stone-500 mt-1">{allTickets.length} total tickets</p>
        </div>
      </div>

      <TicketTable tickets={open} title="Open tickets" />
      {resolved.length > 0 && (
        <div className="mt-8">
          <TicketTable tickets={resolved} title="Resolved" />
        </div>
      )}
    </div>
    </>
  )
}

function TicketTable({ tickets, title }: { tickets: Ticket[]; title: string }) {
  if (tickets.length === 0) return null
  return (
    <div>
      <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">{title} ({tickets.length})</h2>
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              <th className="text-left px-4 py-3 font-medium text-stone-500">User</th>
              <th className="text-left px-4 py-3 font-medium text-stone-500">Subject</th>
              <th className="text-left px-4 py-3 font-medium text-stone-500">Type</th>
              <th className="text-left px-4 py-3 font-medium text-stone-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-stone-500">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {tickets.map(ticket => {
              const unread = ticket.support_replies.filter(r => !r.from_admin && r.read_at === null).length
              return (
                <tr key={ticket.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-stone-200 flex items-center justify-center text-stone-700 text-xs font-medium overflow-hidden shrink-0">
                        {ticket.profiles?.avatar_url
                          ? <img src={ticket.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                          : initials(ticket.profiles?.name ?? null)
                        }
                      </div>
                      <span className="text-stone-700 text-sm">{ticket.profiles?.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-stone-800 font-medium">{ticket.subject}</span>
                    {unread > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
                        {unread}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-500 capitalize">{ticket.type}</td>
                  <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                  <td className="px-4 py-3 text-stone-400">{timeAgo(ticket.updated_at)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/support/${ticket.id}`}
                      className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
