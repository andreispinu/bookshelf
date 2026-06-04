'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { LoanWithDetails, SentRequest, WorkflowStatus } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isOverdueDate(d: string | null) {
  return d ? new Date(d) < new Date() : false
}

const STATUS_BADGE: Record<WorkflowStatus, { label: string; className: string }> = {
  pending_handoff:     { label: 'workflowPendingHandoff',     className: 'border-amber-200 text-amber-700 bg-amber-50' },
  pending_receipt:     { label: 'workflowPendingReceipt',     className: 'border-amber-200 text-amber-700 bg-amber-50' },
  active:              { label: 'workflowActive',              className: 'border-emerald-200 text-emerald-700 bg-emerald-50' },
  overdue:             { label: 'workflowOverdue',             className: 'border-red-200 text-red-700 bg-red-50' },
  extension_requested: { label: 'workflowExtensionRequested', className: 'border-amber-200 text-amber-700 bg-amber-50' },
  recall_requested:    { label: 'workflowRecallRequested',    className: 'border-red-200 text-red-700 bg-red-50' },
  pending_return:      { label: 'workflowPendingReturn',      className: 'border-amber-200 text-amber-700 bg-amber-50' },
  completed:           { label: 'workflowCompleted',          className: 'border-stone-200 text-stone-500 bg-stone-50' },
}

// Sort loans so action-needed statuses appear first
const STATUS_PRIORITY: Record<WorkflowStatus, number> = {
  extension_requested: 0,
  recall_requested:    1,
  pending_return:      2,
  pending_handoff:     3,
  pending_receipt:     4,
  overdue:             5,
  active:              6,
  completed:           99,
}

function sortLoans(loans: LoanWithDetails[]) {
  return [...loans].sort((a, b) => STATUS_PRIORITY[a.workflow_status] - STATUS_PRIORITY[b.workflow_status])
}

// ─── Extension modal ──────────────────────────────────────────────────────────

type ExtensionModalProps = {
  loanId: string
  onClose: () => void
  onSuccess: () => void
}

function ExtensionModal({ loanId, onClose, onSuccess }: ExtensionModalProps) {
  const t = useTranslations('loans')
  const tc = useTranslations('common')
  const [selectedDays, setSelectedDays] = useState<number | null>(14)
  const [customMode, setCustomMode] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const requestedDays = customMode ? (parseInt(customValue) || null) : selectedDays

  async function handleSubmit() {
    if (!requestedDays) { toast.error(t('selectDaysFirst')); return }
    setLoading(true)
    try {
      const res = await fetch('/api/loan-extensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId, requestedDays, requesterNote: note }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? tc('somethingWentWrong'))
        return
      }
      toast.success(t('extensionRequested'))
      onSuccess()
    } catch {
      toast.error(tc('somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
        <h3 className="font-semibold text-stone-800 text-base mb-4">{t('requestExtension')}</h3>
        <label className="block text-xs font-medium text-stone-600 mb-1.5">{t('additionalDays')}</label>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {[7, 14, 30, 60].map(d => (
            <button key={d} type="button"
              onClick={() => { setSelectedDays(d); setCustomMode(false); setCustomValue('') }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selectedDays === d && !customMode ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {d}d
            </button>
          ))}
          <button type="button"
            onClick={() => { setCustomMode(true); setSelectedDays(null) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              customMode ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {t('customDays')}
          </button>
        </div>
        {customMode && (
          <input type="number" min="1" max="365" value={customValue} onChange={e => setCustomValue(e.target.value)}
            placeholder={t('customDaysPlaceholder')}
            className="mb-3 w-28 rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        )}
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
          placeholder={t('extensionNoteOptional')}
          className="w-full resize-none rounded-xl border border-stone-200 px-3 py-2.5 text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
        />
        <div className="flex gap-2 mt-4">
          <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-stone-800 text-white hover:bg-stone-700">
            {loading ? tc('loading') : t('sendExtensionRequest')}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading} className="border-stone-200 text-stone-600 hover:bg-stone-50">
            {tc('cancel')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Recall modal ─────────────────────────────────────────────────────────────

type RecallModalProps = {
  loanId: string
  onClose: () => void
  onSuccess: () => void
}

function RecallModal({ loanId, onClose, onSuccess }: RecallModalProps) {
  const t = useTranslations('loans')
  const tc = useTranslations('common')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    try {
      const res = await fetch('/api/loan-recalls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId, reason }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? tc('somethingWentWrong'))
        return
      }
      toast.success(t('recallRequested'))
      onSuccess()
    } catch {
      toast.error(tc('somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
        <h3 className="font-semibold text-stone-800 text-base mb-4">{t('requestRecall')}</h3>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
          placeholder={t('recallReasonOptional')}
          className="w-full resize-none rounded-xl border border-stone-200 px-3 py-2.5 text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
        />
        <div className="flex gap-2 mt-4">
          <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-stone-800 text-white hover:bg-stone-700">
            {loading ? tc('loading') : t('sendRecallRequest')}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading} className="border-stone-200 text-stone-600 hover:bg-stone-50">
            {tc('cancel')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Loan card ────────────────────────────────────────────────────────────────

type LoanCardProps = {
  loan: LoanWithDetails
  role: 'lender' | 'borrower'
  onWorkflowAction: (loanId: string, action: string) => Promise<void>
  onExtensionDecision: (extensionId: string, loanId: string, action: 'approve' | 'decline') => Promise<void>
  onRecallAcknowledge: (recallId: string) => Promise<void>
  onRequestExtension: (loanId: string) => void
  onRequestRecall: (loanId: string) => void
  loading: boolean
}

function LoanCard({ loan, role, onWorkflowAction, onExtensionDecision, onRecallAcknowledge, onRequestExtension, onRequestRecall, loading }: LoanCardProps) {
  const t = useTranslations('loans')
  const tc = useTranslations('common')
  const status = loan.workflow_status
  const badge = STATUS_BADGE[status]

  return (
    <li className="py-4 flex items-start gap-3">
      {/* Cover */}
      <div className="shrink-0 w-9 h-12 rounded bg-stone-200 overflow-hidden flex items-center justify-center">
        {loan.book.cover_url
          ? <img src={loan.book.cover_url} alt={loan.book.title} className="w-full h-full object-cover" />
          : <span className="text-stone-400 text-base">📖</span>
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-stone-800 truncate">{loan.book.title}</p>
            <p className="text-sm text-stone-500 truncate">{loan.book.author}</p>
          </div>
          <Badge variant="outline" className={`shrink-0 text-xs ${badge.className}`}>
            {t(badge.label as Parameters<typeof t>[0])}
          </Badge>
        </div>

        {/* Counterparty + date */}
        <p className="text-xs text-stone-400 mt-1">
          {role === 'lender'
            ? t('lentTo', { name: loan.otherParty.name, date: formatDate(loan.loaned_at) })
            : t('borrowedFrom', { name: loan.otherParty.name, date: formatDate(loan.loaned_at) })
          }
        </p>

        {/* Due date */}
        {loan.due_date && (
          <p className={`text-xs mt-0.5 ${isOverdueDate(loan.due_date) ? 'text-red-600 font-medium' : 'text-stone-400'}`}>
            {isOverdueDate(loan.due_date)
              ? t('overdueLabel', { date: formatDate(loan.due_date) })
              : t('dueOn', { date: formatDate(loan.due_date) })
            }
          </p>
        )}

        {/* Action banners */}
        <div className="mt-3 space-y-2">

          {/* LENDER actions */}
          {role === 'lender' && status === 'pending_handoff' && (
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={loading} onClick={() => onWorkflowAction(loan.id, 'confirm_handoff')}
                className="bg-stone-800 text-white hover:bg-stone-700 h-8 px-3 text-xs">
                {loading ? tc('saving') : t('confirmHandoff')}
              </Button>
            </div>
          )}

          {role === 'lender' && status === 'pending_receipt' && (
            <p className="text-xs text-stone-500 italic">{t('waitingForReceipt', { name: loan.otherParty.name })}</p>
          )}

          {role === 'lender' && (status === 'active' || status === 'overdue') && (
            <button onClick={() => onRequestRecall(loan.id)}
              className="text-xs text-stone-500 hover:text-stone-800 underline underline-offset-2 transition-colors">
              {t('requestRecall')}
            </button>
          )}

          {role === 'lender' && status === 'extension_requested' && loan.pendingExtension && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
              <p className="text-xs font-medium text-amber-800">
                {t('extensionRequestBanner', { name: loan.otherParty.name, days: loan.pendingExtension.requested_days })}
              </p>
              {loan.pendingExtension.requester_note && (
                <p className="text-xs text-amber-700 italic">"{loan.pendingExtension.requester_note}"</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" disabled={loading}
                  onClick={() => onExtensionDecision(loan.pendingExtension!.id, loan.id, 'approve')}
                  className="bg-stone-800 text-white hover:bg-stone-700 h-8 px-3 text-xs">
                  {loading ? tc('saving') : t('approveExtension')}
                </Button>
                <Button size="sm" variant="outline" disabled={loading}
                  onClick={() => onExtensionDecision(loan.pendingExtension!.id, loan.id, 'decline')}
                  className="border-stone-200 text-stone-600 hover:bg-stone-50 h-8 px-3 text-xs">
                  {loading ? tc('saving') : t('declineExtension')}
                </Button>
              </div>
            </div>
          )}

          {role === 'lender' && status === 'recall_requested' && (
            <p className="text-xs text-stone-500 italic">{t('waitingForAcknowledge', { name: loan.otherParty.name })}</p>
          )}

          {role === 'lender' && status === 'pending_return' && (
            <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 space-y-2">
              <p className="text-xs font-medium text-stone-700">
                {t('returnInitiatedBanner', { name: loan.otherParty.name })}
              </p>
              <div className="flex gap-2">
                <Button size="sm" disabled={loading}
                  onClick={() => onWorkflowAction(loan.id, 'confirm_return')}
                  className="bg-stone-800 text-white hover:bg-stone-700 h-8 px-3 text-xs">
                  {loading ? tc('saving') : t('confirmReturn')}
                </Button>
                <Button size="sm" variant="outline" disabled={loading}
                  onClick={() => onWorkflowAction(loan.id, 'deny_return')}
                  className="border-stone-200 text-stone-600 hover:bg-stone-50 h-8 px-3 text-xs">
                  {loading ? tc('saving') : t('denyReturn')}
                </Button>
              </div>
            </div>
          )}

          {/* BORROWER actions */}
          {role === 'borrower' && status === 'pending_handoff' && (
            <p className="text-xs text-stone-500 italic">{t('waitingForHandoff', { name: loan.otherParty.name })}</p>
          )}

          {role === 'borrower' && status === 'pending_receipt' && (
            <Button size="sm" disabled={loading}
              onClick={() => onWorkflowAction(loan.id, 'confirm_receipt')}
              className="bg-stone-800 text-white hover:bg-stone-700 h-8 px-3 text-xs">
              {loading ? tc('saving') : t('confirmReceipt')}
            </Button>
          )}

          {role === 'borrower' && (status === 'active' || status === 'overdue') && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" disabled={loading}
                onClick={() => onWorkflowAction(loan.id, 'initiate_return')}
                className="bg-stone-800 text-white hover:bg-stone-700 h-8 px-3 text-xs">
                {loading ? tc('saving') : t('initiateReturn')}
              </Button>
              <button onClick={() => onRequestExtension(loan.id)}
                className="text-xs text-stone-500 hover:text-stone-800 underline underline-offset-2 transition-colors">
                {t('requestExtension')}
              </button>
            </div>
          )}

          {role === 'borrower' && status === 'extension_requested' && (
            <p className="text-xs text-stone-500 italic">{t('extensionPending')}</p>
          )}

          {role === 'borrower' && status === 'recall_requested' && loan.pendingRecall && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 space-y-2">
              <p className="text-xs font-medium text-red-800">
                {t('recallBanner', { name: loan.otherParty.name })}
              </p>
              {loan.pendingRecall.reason && (
                <p className="text-xs text-red-700 italic">"{loan.pendingRecall.reason}"</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" disabled={loading}
                  onClick={() => onRecallAcknowledge(loan.pendingRecall!.id)}
                  className="bg-stone-800 text-white hover:bg-stone-700 h-8 px-3 text-xs">
                  {loading ? tc('saving') : t('acknowledgeRecall')}
                </Button>
                <Button size="sm" variant="outline" disabled={loading}
                  onClick={() => onWorkflowAction(loan.id, 'initiate_return')}
                  className="border-stone-200 text-stone-600 hover:bg-stone-50 h-8 px-3 text-xs">
                  {loading ? tc('saving') : t('initiateReturn')}
                </Button>
              </div>
            </div>
          )}

          {role === 'borrower' && status === 'pending_return' && (
            <p className="text-xs text-stone-500 italic">{t('returnPendingConfirmation', { name: loan.otherParty.name })}</p>
          )}

        </div>
      </div>
    </li>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LoanList({
  lentOut: initialLentOut,
  borrowed: initialBorrowed,
  sentRequests,
  defaultTab,
}: {
  lentOut: LoanWithDetails[]
  borrowed: LoanWithDetails[]
  sentRequests: SentRequest[]
  defaultTab?: string
}) {
  const t = useTranslations('loans')
  const router = useRouter()
  const [lentOut, setLentOut] = useState(initialLentOut)
  const [borrowed, setBorrowed] = useState(initialBorrowed)
  const [loadingLoanId, setLoadingLoanId] = useState<string | null>(null)
  const [extensionModal, setExtensionModal] = useState<string | null>(null)
  const [recallModal, setRecallModal] = useState<string | null>(null)

  // Sync state when server data refreshes (after router.refresh())
  useEffect(() => { setLentOut(initialLentOut) }, [initialLentOut])
  useEffect(() => { setBorrowed(initialBorrowed) }, [initialBorrowed])

  function updateLoanInState(loanId: string, update: Partial<LoanWithDetails>) {
    const apply = (l: LoanWithDetails) => l.id === loanId ? { ...l, ...update } : l
    setLentOut(prev => prev.map(apply))
    setBorrowed(prev => prev.map(apply))
  }

  async function callWorkflow(loanId: string, action: string) {
    setLoadingLoanId(loanId)
    try {
      const res = await fetch('/api/loans/workflow', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId, action }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? t('actionFailed'))
        return
      }
      // Optimistic update — mutate local state immediately
      if (action === 'confirm_handoff') {
        updateLoanInState(loanId, { workflow_status: 'pending_receipt' })
        toast.success(t('handoffConfirmedToast'))
      } else if (action === 'confirm_receipt') {
        updateLoanInState(loanId, { workflow_status: 'active' })
        toast.success(t('receiptConfirmedToast'))
      } else if (action === 'initiate_return') {
        updateLoanInState(loanId, { workflow_status: 'pending_return' })
        toast.success(t('returnInitiatedToast'))
      } else if (action === 'confirm_return') {
        setLentOut(prev => prev.filter(l => l.id !== loanId))
        toast.success(t('returnConfirmedToast'))
      } else if (action === 'deny_return') {
        const loan = lentOut.find(l => l.id === loanId)
        const reverted: WorkflowStatus = loan && isOverdueDate(loan.due_date) ? 'overdue' : 'active'
        updateLoanInState(loanId, { workflow_status: reverted })
        toast.success(t('returnDeniedToast'))
      }
      router.refresh()
    } catch {
      toast.error(t('actionFailed'))
    } finally {
      setLoadingLoanId(null)
    }
  }

  async function callExtensionDecision(extensionId: string, loanId: string, action: 'approve' | 'decline') {
    setLoadingLoanId(extensionId)
    try {
      const res = await fetch('/api/loan-extensions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionId, action }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? t('actionFailed'))
        return
      }
      // Optimistic: clear pending extension, revert to active/overdue
      const loan = lentOut.find(l => l.id === loanId)
      const newStatus: WorkflowStatus = action === 'approve'
        ? 'active'
        : (loan && isOverdueDate(loan.due_date) ? 'overdue' : 'active')
      updateLoanInState(loanId, { workflow_status: newStatus, pendingExtension: undefined })
      toast.success(action === 'approve' ? t('extensionApprovedToast') : t('extensionDeclinedToast'))
      router.refresh()
    } catch {
      toast.error(t('actionFailed'))
    } finally {
      setLoadingLoanId(null)
    }
  }

  async function callRecallAcknowledge(recallId: string) {
    setLoadingLoanId(recallId)
    try {
      const res = await fetch('/api/loan-recalls', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recallId }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? t('actionFailed'))
        return
      }
      toast.success(t('recallAcknowledged'))
      router.refresh()
    } catch {
      toast.error(t('actionFailed'))
    } finally {
      setLoadingLoanId(null)
    }
  }

  const pendingCount = sentRequests.filter(r => r.status === 'pending').length

  const statusLabel: Record<SentRequest['status'], string> = {
    pending:  t('pending'),
    approved: t('approved'),
    rejected: t('rejected'),
  }

  const statusClass: Record<SentRequest['status'], string> = {
    pending:  'border-amber-200 text-amber-700 bg-amber-50',
    approved: 'border-emerald-200 text-emerald-700 bg-emerald-50',
    rejected: 'border-stone-200 text-stone-500 bg-stone-50',
  }

  return (
    <>
      {extensionModal && (
        <ExtensionModal
          loanId={extensionModal}
          onClose={() => setExtensionModal(null)}
          onSuccess={() => {
            updateLoanInState(extensionModal, { workflow_status: 'extension_requested' })
            setExtensionModal(null)
            router.refresh()
          }}
        />
      )}
      {recallModal && (
        <RecallModal
          loanId={recallModal}
          onClose={() => setRecallModal(null)}
          onSuccess={() => {
            updateLoanInState(recallModal, { workflow_status: 'recall_requested' })
            setRecallModal(null)
            router.refresh()
          }}
        />
      )}

      <Tabs defaultValue={defaultTab ?? 'lent'}>
        <TabsList className="mb-6">
          <TabsTrigger value="lent">
            {t('lentOut')}
            {lentOut.length > 0 && (
              <Badge variant="outline" className="ml-1.5 border-amber-200 text-amber-700 bg-amber-50">
                {lentOut.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="borrowed">
            {t('borrowed')}
            {borrowed.length > 0 && (
              <Badge variant="outline" className="ml-1.5 border-stone-200 text-stone-600">
                {borrowed.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests">
            {t('borrowRequests')}
            {pendingCount > 0 && (
              <Badge variant="outline" className="ml-1.5 border-amber-200 text-amber-700 bg-amber-50">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Lent out */}
        <TabsContent value="lent">
          {lentOut.length === 0 ? (
            <p className="text-sm text-stone-400 py-8 text-center">{t('noLentOut')}</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {sortLoans(lentOut).map(loan => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  role="lender"
                  onWorkflowAction={callWorkflow}
                  onExtensionDecision={callExtensionDecision}
                  onRecallAcknowledge={callRecallAcknowledge}
                  onRequestExtension={setExtensionModal}
                  onRequestRecall={setRecallModal}
                  loading={loadingLoanId === loan.id || loadingLoanId === loan.pendingExtension?.id || loadingLoanId === loan.pendingRecall?.id}
                />
              ))}
            </ul>
          )}
        </TabsContent>

        {/* Borrowed */}
        <TabsContent value="borrowed">
          {borrowed.length === 0 ? (
            <p className="text-sm text-stone-400 py-8 text-center">{t('noBorrowed')}</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {sortLoans(borrowed).map(loan => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  role="borrower"
                  onWorkflowAction={callWorkflow}
                  onExtensionDecision={callExtensionDecision}
                  onRecallAcknowledge={callRecallAcknowledge}
                  onRequestExtension={setExtensionModal}
                  onRequestRecall={setRecallModal}
                  loading={loadingLoanId === loan.id || loadingLoanId === loan.pendingExtension?.id || loadingLoanId === loan.pendingRecall?.id}
                />
              ))}
            </ul>
          )}
        </TabsContent>

        {/* Borrow requests sent */}
        <TabsContent value="requests">
          {sentRequests.length === 0 ? (
            <p className="text-sm text-stone-400 py-8 text-center">{t('noSentRequests')}</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {sentRequests.map(req => (
                <li key={req.id} className="py-4 flex items-start gap-3">
                  <div className="shrink-0 w-9 h-12 rounded bg-stone-200 overflow-hidden flex items-center justify-center">
                    {req.book.cover_url
                      ? <img src={req.book.cover_url} alt={req.book.title} className="w-full h-full object-cover" />
                      : <span className="text-stone-400 text-base">📖</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 truncate">{req.book.title}</p>
                    <p className="text-sm text-stone-500 truncate">{req.book.author}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {t('ownedBy', { name: req.owner.name, date: formatDate(req.created_at) })}
                    </p>
                    {req.requested_days && (
                      <p className="text-xs text-stone-400 mt-0.5">{t('requestedDaysLabel', { days: req.requested_days })}</p>
                    )}
                    {req.owner_message && req.status !== 'pending' && (
                      <p className="text-xs text-stone-500 mt-1 italic">"{req.owner_message}"</p>
                    )}
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-xs ${statusClass[req.status]}`}>
                    {statusLabel[req.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 pt-4 border-t border-stone-100">
            <Link href="/loans/requests" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
              {t('viewIncomingRequests')}
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}
