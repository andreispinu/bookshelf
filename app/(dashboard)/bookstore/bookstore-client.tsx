'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  updateWishlistItem,
  markAsPurchased,
  deleteWishlistItem,
  checkFriendAvailability,
} from './actions'
import { CATEGORIES } from '@/lib/categories'
import { LANGUAGES } from '@/lib/languages'
import type { WishlistItem, FriendMatch } from '@/types'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function WishlistMenu({
  item,
  isDeleting,
  isMarking,
  isChecking,
  onEdit,
  onMarkPurchased,
  onCheckFriends,
  onDelete,
}: {
  item: WishlistItem
  isDeleting: boolean
  isMarking: boolean
  isChecking: boolean
  onEdit: () => void
  onMarkPurchased: () => void
  onCheckFriends: () => void
  onDelete: () => void
}) {
  const t = useTranslations('bookstore')
  const tc = useTranslations('common')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="text-stone-400 hover:text-stone-700 px-2"
        onClick={() => setOpen(v => !v)}
        aria-label="More actions"
      >
        ⋯
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-stone-200 bg-white shadow-md py-1 z-10">
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
            onClick={() => { setOpen(false); onEdit() }}
          >
            {tc('edit')}
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40"
            disabled={item.status === 'purchased' || isMarking}
            onClick={() => { setOpen(false); onMarkPurchased() }}
          >
            {isMarking ? tc('saving') : t('markAsPurchased')}
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40"
            disabled={isChecking}
            onClick={() => { setOpen(false); onCheckFriends() }}
          >
            {isChecking ? t('checkingFriends') : t('checkFriendsAgain')}
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
            disabled={isDeleting}
            onClick={() => { setOpen(false); onDelete() }}
          >
            {isDeleting ? tc('saving') : tc('delete')}
          </button>
        </div>
      )}
    </div>
  )
}

export default function BookstoreClient({ items: initial }: { items: WishlistItem[] }) {
  const t = useTranslations('bookstore')
  const tc = useTranslations('common')

  const [items, setItems] = useState(initial)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [checkingId, setCheckingId] = useState<string | null>(null)

  // Edit dialog
  const [editing, setEditing] = useState<WishlistItem | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editFields, setEditFields] = useState({ title: '', author: '', isbn: '', category: '', language: '', description: '' })

  // Friend check result modal
  const [friendResult, setFriendResult] = useState<{ itemTitle: string; matches: FriendMatch[] } | null>(null)
  const [borrowingMatch, setBorrowingMatch] = useState<FriendMatch | null>(null)
  const [borrowMessage, setBorrowMessage] = useState('')
  const [borrowLoading, setBorrowLoading] = useState(false)
  const [sentBorrowIds, setSentBorrowIds] = useState<Set<string>>(new Set())

  function openEdit(item: WishlistItem) {
    setEditing(item)
    setEditError(null)
    setEditFields({
      title:       item.title,
      author:      item.author,
      isbn:        item.isbn ?? '',
      category:    item.category ?? '',
      language:    item.language ?? '',
      description: item.description ?? '',
    })
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setEditError(null)
    setEditLoading(true)
    const data = {
      title:       editFields.title.trim(),
      author:      editFields.author.trim(),
      isbn:        editFields.isbn.trim() || null,
      category:    editFields.category || null,
      language:    editFields.language || null,
      description: editFields.description.trim() || null,
    }
    const result = await updateWishlistItem(editing.id, data)
    if (result.error) { setEditError(result.error); setEditLoading(false); return }
    setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...data } : i))
    setEditing(null)
    setEditLoading(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deleteWishlistItem(id)
    if (result.error) toast.error(result.error)
    else setItems(prev => prev.filter(i => i.id !== id))
    setDeletingId(null)
  }

  async function handleMarkPurchased(id: string) {
    setMarkingId(id)
    const result = await markAsPurchased(id)
    if (result.error) toast.error(result.error)
    else setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'purchased' } : i))
    setMarkingId(null)
  }

  async function handleCheckFriends(item: WishlistItem) {
    setCheckingId(item.id)
    const result = await checkFriendAvailability(item.id)
    setCheckingId(null)
    if (result.error) { toast.error(result.error); return }
    // Update has_friend_copy locally
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, has_friend_copy: result.matches.length > 0 } : i))
    setFriendResult({ itemTitle: item.title, matches: result.matches })
    setSentBorrowIds(new Set())
  }

  async function handleBorrowRequest(match: FriendMatch) {
    setBorrowLoading(true)
    try {
      const res = await fetch('/api/borrow-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: match.bookId, ownerId: match.ownerId, message: borrowMessage }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? tc('somethingWentWrong')); return }
      setSentBorrowIds(prev => new Set(prev).add(match.bookId))
      setBorrowingMatch(null)
      setBorrowMessage('')
    } catch {
      toast.error(tc('somethingWentWrong'))
    } finally {
      setBorrowLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-stone-400">
        <p className="text-lg">{t('noItemsYet')}</p>
        <p className="text-sm mt-1">{t('addFirstItem')}</p>
      </div>
    )
  }

  const statusStyle = {
    wanted:    'border-stone-200 text-stone-600 bg-stone-50',
    borrowed:  'border-amber-200 text-amber-700 bg-amber-50',
    purchased: 'border-emerald-200 text-emerald-700 bg-emerald-50',
  }

  return (
    <>
      <ul className="divide-y divide-stone-100">
        {items.map(item => (
          <li key={item.id} className="flex items-center gap-4 py-4">
            <div className="shrink-0 w-10 h-14 rounded bg-stone-200 overflow-hidden flex items-center justify-center">
              {item.cover_url
                ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                : <span className="text-stone-400 text-lg">📚</span>
              }
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-stone-800 truncate">{item.title}</p>
              <p className="text-sm text-stone-500 truncate">{item.author}</p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {item.category && <p className="text-xs text-stone-400">{item.category}</p>}
                {item.has_friend_copy && (
                  <button
                    onClick={() => handleCheckFriends(item)}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5 hover:bg-teal-100 transition-colors"
                  >
                    {t('friendHasThis')}
                  </button>
                )}
              </div>
            </div>

            <span className={`shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5 border ${statusStyle[item.status]}`}>
              {t(`status_${item.status}`)}
            </span>

            <WishlistMenu
              item={item}
              isDeleting={deletingId === item.id}
              isMarking={markingId === item.id}
              isChecking={checkingId === item.id}
              onEdit={() => openEdit(item)}
              onMarkPurchased={() => handleMarkPurchased(item.id)}
              onCheckFriends={() => handleCheckFriends(item)}
              onDelete={() => handleDelete(item.id)}
            />
          </li>
        ))}
      </ul>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="text-stone-800">{t('editItem')}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={handleUpdate} className="flex flex-col flex-1 min-h-0">
              <div className="space-y-4 px-6 py-2 overflow-y-auto flex-1">
                <div className="space-y-1.5">
                  <Label className="text-stone-700">{t('titleField')}</Label>
                  <Input value={editFields.title} onChange={e => setEditFields(p => ({ ...p, title: e.target.value }))}
                    required className="border-stone-200 focus-visible:ring-stone-400" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-stone-700">{t('authorField')}</Label>
                  <Input value={editFields.author} onChange={e => setEditFields(p => ({ ...p, author: e.target.value }))}
                    required className="border-stone-200 focus-visible:ring-stone-400" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-stone-700">ISBN <span className="text-stone-400 font-normal">({tc('optional')})</span></Label>
                  <Input value={editFields.isbn} onChange={e => setEditFields(p => ({ ...p, isbn: e.target.value }))}
                    className="border-stone-200 focus-visible:ring-stone-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-stone-700">{t('category')} <span className="text-stone-400 font-normal">({tc('optional')})</span></Label>
                    <select value={editFields.category} onChange={e => setEditFields(p => ({ ...p, category: e.target.value }))}
                      className="w-full h-9 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400">
                      <option value="">{t('noCategory')}</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-stone-700">{t('language')} <span className="text-stone-400 font-normal">({tc('optional')})</span></Label>
                    <select value={editFields.language} onChange={e => setEditFields(p => ({ ...p, language: e.target.value }))}
                      className="w-full h-9 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400">
                      <option value="">{t('noLanguage')}</option>
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-stone-700">{t('description')} <span className="text-stone-400 font-normal">({tc('optional')})</span></Label>
                  <Textarea value={editFields.description} onChange={e => setEditFields(p => ({ ...p, description: e.target.value }))}
                    rows={3} className="border-stone-200 focus-visible:ring-stone-400 resize-none" />
                </div>
                {editError && <p className="text-sm text-red-600">{editError}</p>}
              </div>
              <DialogFooter className="px-6 py-4 border-t border-stone-100 shrink-0">
                <Button type="button" variant="ghost" className="text-stone-500" onClick={() => setEditing(null)}>
                  {tc('cancel')}
                </Button>
                <Button type="submit" disabled={editLoading} className="bg-stone-800 hover:bg-stone-700 text-white">
                  {editLoading ? tc('saving') : tc('save')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Friend availability modal */}
      <Dialog open={!!friendResult} onOpenChange={open => { if (!open) { setFriendResult(null); setSentBorrowIds(new Set()) } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-stone-800">
              {(friendResult?.matches.length ?? 0) > 0 ? t('friendsHaveThisTitle') : t('noFriendsTitle')}
            </DialogTitle>
          </DialogHeader>

          {friendResult?.matches.length === 0 && (
            <p className="text-sm text-stone-500 py-2">{t('noFriendsHaveThis')}</p>
          )}

          {(friendResult?.matches.length ?? 0) > 0 && (
            <div className="space-y-3 py-1">
              <p className="text-sm text-stone-500">{t('friendsHaveThisDesc')}</p>
              <ul className="divide-y divide-stone-100">
                {friendResult?.matches.map(match => (
                  <li key={match.bookId} className="flex items-center gap-3 py-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      {match.ownerAvatar && <AvatarImage src={match.ownerAvatar} alt={match.ownerName} />}
                      <AvatarFallback className="bg-stone-200 text-stone-700 text-xs">
                        {initials(match.ownerName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{match.ownerName}</p>
                      <span className={`inline-block text-[10px] font-medium rounded-full px-2 py-0.5 border ${
                        match.status === 'available'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {match.status === 'available' ? t('available') : t('lentOut')}
                      </span>
                    </div>
                    {sentBorrowIds.has(match.bookId) ? (
                      <span className="text-xs text-emerald-600 font-medium shrink-0">{t('requestSent')}</span>
                    ) : match.status === 'available' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-stone-300 text-stone-700 shrink-0 text-xs"
                        onClick={() => setBorrowingMatch(match)}
                      >
                        {t('requestToBorrow')}
                      </Button>
                    ) : (
                      <span className="text-xs text-stone-400 shrink-0">{t('currentlyLentOut')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              className="text-stone-500"
              onClick={() => { setFriendResult(null); setSentBorrowIds(new Set()) }}
            >
              {tc('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Borrow request sub-modal */}
      {borrowingMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) { setBorrowingMatch(null); setBorrowMessage('') } }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
            <h3 className="font-semibold text-stone-800 text-base mb-1">{t('requestToBorrow')}</h3>
            <p className="text-sm text-stone-500 mb-4">{t('fromFriend', { name: borrowingMatch.ownerName })}</p>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              {t('messageLabel')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
            </label>
            <textarea
              value={borrowMessage}
              onChange={e => setBorrowMessage(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => handleBorrowRequest(borrowingMatch)}
                disabled={borrowLoading}
                className="flex-1 bg-stone-800 text-white hover:bg-stone-700"
              >
                {borrowLoading ? tc('loading') : t('sendRequest')}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setBorrowingMatch(null); setBorrowMessage('') }}
                disabled={borrowLoading}
                className="border-stone-200 text-stone-600 hover:bg-stone-50"
              >
                {tc('cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
