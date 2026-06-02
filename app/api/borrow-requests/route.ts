import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabase
    .from('borrow_requests')
    .select(`
      id, book_id, requester_id, owner_id, status,
      requester_message, owner_message, created_at, updated_at,
      book:books!borrow_requests_book_id_fkey(id, title, author, cover_url),
      requester:profiles!borrow_requests_requester_id_fkey(id, name, avatar_url)
    `)
    .eq('owner_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  const { bookId, ownerId, message } = body
  if (!bookId || !ownerId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Check for existing pending request
  const { data: existing } = await supabase
    .from('borrow_requests')
    .select('id')
    .eq('book_id', bookId)
    .eq('requester_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'You already have a pending request for this book' }, { status: 409 })
  }

  const { data: req, error } = await supabase
    .from('borrow_requests')
    .insert({
      book_id: bookId,
      requester_id: user.id,
      owner_id: ownerId,
      requester_message: message?.trim() || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If the requester included a message, save it to the messages table
  if (message?.trim()) {
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: ownerId,
      content: message.trim(),
    })
  }

  // Notify the book owner
  await supabase.from('notifications').insert({
    user_id: ownerId,
    type: 'borrow_request',
    actor_id: user.id,
    book_id: bookId,
  })

  return NextResponse.json({ request: req })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  const { id, action, message } = body
  if (!id || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Fetch and verify ownership
  const { data: req, error: fetchError } = await supabase
    .from('borrow_requests')
    .select('id, book_id, requester_id, owner_id, status')
    .eq('id', id)
    .eq('owner_id', user.id)
    .eq('status', 'pending')
    .single()

  if (fetchError || !req) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  const { error: updateError } = await supabase
    .from('borrow_requests')
    .update({
      status: newStatus,
      owner_message: message?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  if (action === 'approve') {
    await supabase.from('loans').insert({
      book_id: req.book_id,
      lender_id: user.id,
      borrower_id: req.requester_id,
    })
    await supabase
      .from('books')
      .update({ status: 'lent_out' })
      .eq('id', req.book_id)
      .eq('user_id', user.id)
  }

  // If the owner included a message, save it to the messages table
  if (message?.trim()) {
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: req.requester_id,
      content: message.trim(),
    })
  }

  // Notify the requester
  await supabase.from('notifications').insert({
    user_id: req.requester_id,
    type: action === 'approve' ? 'borrow_approved' : 'borrow_rejected',
    actor_id: user.id,
    book_id: req.book_id,
  })

  return NextResponse.json({ ok: true })
}
