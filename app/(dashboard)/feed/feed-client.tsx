'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Heart, MessageCircle, Trash2, BookOpen, BookMarked, ArrowLeftRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Actor = { id: string; name: string; avatar_url: string | null }
type Book = { id: string; title: string; author: string; cover_url: string | null } | null

export type FeedEvent = {
  id: string
  user_id: string
  event_type: string
  book_id: string | null
  meta: Record<string, unknown>
  created_at: string
  actor: Actor | null
  book: Book
  likes_count: number
  liked_by_me: boolean
  comments_count: number
}

type Comment = {
  id: string
  feed_id: string
  user_id: string
  content: string
  created_at: string
  author: Actor | null
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function AvatarCircle({ actor, size = 36 }: { actor: Actor | null; size?: number }) {
  const cls = `rounded-full bg-stone-200 flex items-center justify-center text-stone-700 text-xs font-medium overflow-hidden shrink-0`
  const style = { width: size, height: size, minWidth: size }
  if (!actor) return <div className={cls} style={style}>?</div>
  return (
    <div className={cls} style={style}>
      {actor.avatar_url
        ? <img src={actor.avatar_url} alt={actor.name} className="w-full h-full object-cover" />
        : initials(actor.name)
      }
    </div>
  )
}

function EventIcon({ type }: { type: string }) {
  const cls = 'h-4 w-4'
  if (type === 'book_added') return <BookOpen className={cls} />
  if (type === 'book_lent') return <ArrowLeftRight className={cls} />
  if (type === 'book_borrowed') return <BookMarked className={cls} />
  if (type === 'reading_started') return <BookOpen className={cls} />
  if (type === 'reading_finished') return <Star className={cls} />
  return <BookOpen className={cls} />
}

function FeedItem({
  event,
  currentUserId,
  t,
}: {
  event: FeedEvent
  currentUserId: string
  t: ReturnType<typeof useTranslations<'feed'>>
}) {
  const [likesCount, setLikesCount] = useState(event.likes_count)
  const [likedByMe, setLikedByMe] = useState(event.liked_by_me)
  const [commentsCount, setCommentsCount] = useState(event.comments_count)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const actor = event.actor
  const meta = event.meta
  const bookTitle = (event.book?.title ?? meta.title ?? '') as string
  const bookAuthor = (event.book?.author ?? meta.author ?? '') as string
  const coverUrl = (event.book?.cover_url ?? meta.cover_url ?? null) as string | null

  async function handleLike() {
    const wasLiked = likedByMe
    setLikedByMe(!wasLiked)
    setLikesCount(c => wasLiked ? c - 1 : c + 1)
    const res = await fetch(`/api/feed/${event.id}/like`, { method: 'POST' })
    if (!res.ok) {
      // revert
      setLikedByMe(wasLiked)
      setLikesCount(c => wasLiked ? c + 1 : c - 1)
    }
  }

  async function handleToggleComments() {
    if (!showComments && !commentsLoaded) {
      const res = await fetch(`/api/feed/${event.id}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments ?? [])
        setCommentsLoaded(true)
      }
    }
    setShowComments(v => !v)
  }

  async function handleSendComment() {
    if (!commentText.trim()) return
    setSending(true)
    const res = await fetch(`/api/feed/${event.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentText.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setComments(prev => [...prev, data.comment])
      setCommentsCount(c => c + 1)
      setCommentText('')
    }
    setSending(false)
  }

  async function handleDeleteComment(commentId: string) {
    const res = await fetch(`/api/feed/comments/${commentId}`, { method: 'DELETE' })
    if (res.ok) {
      setComments(prev => prev.filter(c => c.id !== commentId))
      setCommentsCount(c => c - 1)
    }
  }

  function getEventText() {
    const name = actor?.name ?? 'Someone'
    if (event.event_type === 'book_added') return t('bookAdded', { name })
    if (event.event_type === 'book_lent') return t('bookLent', { name })
    if (event.event_type === 'book_borrowed') return t('bookBorrowed', { name })
    if (event.event_type === 'reading_started') return t('readingStarted', { name })
    if (event.event_type === 'reading_finished') return t('readingFinished', { name })
    return ''
  }

  const rating = meta.rating as number | null | undefined

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <AvatarCircle actor={actor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm text-stone-500">
            <EventIcon type={event.event_type} />
            <span className="text-stone-700">{getEventText()}</span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">{timeAgo(event.created_at)}</p>
        </div>
      </div>

      {/* Book card */}
      {bookTitle && (
        <div className="mx-4 mb-3 flex items-center gap-3 bg-stone-50 rounded-lg p-3 border border-stone-100">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={bookTitle}
              className="h-14 w-10 object-cover rounded shadow-sm shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="h-14 w-10 bg-stone-200 rounded flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-stone-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-800 leading-snug line-clamp-2">{bookTitle}</p>
            {bookAuthor && <p className="text-xs text-stone-500 mt-0.5">{bookAuthor}</p>}
            {rating && rating >= 1 && (
              <div className="flex items-center gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-3 w-3"
                    fill={i < rating ? '#f59e0b' : 'none'}
                    stroke={i < rating ? '#f59e0b' : '#d6d3d1'}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 pb-3 border-t border-stone-100 pt-2.5">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            likedByMe ? 'text-red-500' : 'text-stone-400 hover:text-red-400'
          }`}
        >
          <Heart className="h-4 w-4" fill={likedByMe ? 'currentColor' : 'none'} />
          {likesCount > 0 && <span>{likesCount}</span>}
          <span className="sr-only">{likedByMe ? t('liked') : t('like')}</span>
        </button>
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          {commentsCount > 0 && <span>{commentsCount}</span>}
          <span className="sr-only">{t('comment')}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-stone-100 px-4 pb-4 pt-3 space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-2">
              <AvatarCircle actor={c.author} size={28} />
              <div className="flex-1 min-w-0 bg-stone-50 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-stone-700">{c.author?.name ?? 'Unknown'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">{timeAgo(c.created_at)}</span>
                    {c.user_id === currentUserId && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-stone-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-stone-700 mt-0.5 leading-snug">{c.content}</p>
              </div>
            </div>
          ))}

          {/* Comment input */}
          <div className="flex items-start gap-2 mt-2">
            <div className="w-7" />
            <div className="flex-1 flex gap-2">
              <textarea
                ref={textareaRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment() }
                }}
                placeholder={t('writeComment')}
                rows={1}
                className="flex-1 resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
              <Button
                size="sm"
                variant="default"
                onClick={handleSendComment}
                disabled={sending || !commentText.trim()}
                className="shrink-0"
              >
                {t('send')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FeedClient({
  initialEvents,
  initialHasMore,
  currentUserId,
}: {
  initialEvents: FeedEvent[]
  initialHasMore: boolean
  currentUserId: string
}) {
  const t = useTranslations('feed')
  const [events, setEvents] = useState<FeedEvent[]>(initialEvents)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)

  async function loadMore() {
    setLoading(true)
    const res = await fetch(`/api/feed?offset=${events.length}`)
    if (res.ok) {
      const data = await res.json()
      setEvents(prev => [...prev, ...(data.events ?? [])])
      setHasMore(data.hasMore ?? false)
    }
    setLoading(false)
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-stone-800 font-medium mb-1">{t('emptyTitle')}</p>
        <p className="text-stone-400 text-sm max-w-xs mx-auto">{t('emptyMessage')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {events.map(event => (
        <FeedItem key={event.id} event={event} currentUserId={currentUserId} t={t} />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? t('loading') : t('loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
}
