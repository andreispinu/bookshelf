import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { buyRequestEmail } from '@/lib/email-templates'

// GET /api/sale-requests?role=buyer|seller — list sale requests
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = req.nextUrl.searchParams.get('role')

  let query = supabaseAdmin
    .from('sale_requests')
    .select(`
      id, book_id, buyer_id, seller_id, message, sale_price, sale_currency, status, created_at, updated_at,
      book:books!sale_requests_book_id_fkey(id, title, author, cover_url),
      buyer:profiles!sale_requests_buyer_id_fkey(id, name, avatar_url),
      seller:profiles!sale_requests_seller_id_fkey(id, name, avatar_url)
    `)
    .order('created_at', { ascending: false })

  if (role === 'buyer') {
    query = query.eq('buyer_id', user.id)
  } else if (role === 'seller') {
    query = query.eq('seller_id', user.id)
  } else {
    query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ saleRequests: data ?? [] })
}

// POST /api/sale-requests — create a buy request (buyer)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, sellerId: sellerIdInput, message } = await req.json()
  if (!bookId) return NextResponse.json({ error: 'bookId required' }, { status: 400 })

  // Get book info
  const { data: book } = await supabaseAdmin
    .from('books')
    .select('id, title, author, cover_url, sale_price, sale_currency, availability_mode, user_id, condition_note')
    .eq('id', bookId)
    .single()

  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }
  // The seller is always the book owner. An optional sellerId from the client
  // (legacy callers) must match; the marketplace omits it entirely.
  const sellerId = book.user_id
  if (sellerIdInput && sellerIdInput !== sellerId) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }
  if (sellerId === user.id) {
    return NextResponse.json({ error: 'You cannot buy your own book' }, { status: 400 })
  }
  if (!['sell_only', 'lend_and_sell'].includes(book.availability_mode ?? '')) {
    return NextResponse.json({ error: 'Book is not available for sale' }, { status: 400 })
  }

  // Get buyer profile
  const { data: buyerProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, name, first_name')
    .eq('id', user.id)
    .single()

  // Create sale request
  const { data: saleRequest, error } = await supabaseAdmin
    .from('sale_requests')
    .insert({
      book_id: bookId,
      buyer_id: user.id,
      seller_id: sellerId,
      message: message?.trim() || null,
      sale_price: book.sale_price,
      sale_currency: book.sale_currency ?? 'EUR',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insert SALE_REQUEST message (buyer → seller)
  const msgPayload = JSON.stringify({
    requestId: saleRequest.id,
    bookId: book.id,
    bookTitle: book.title,
    bookAuthor: book.author,
    coverUrl: book.cover_url,
    price: book.sale_price,
    currency: book.sale_currency ?? 'EUR',
    conditionNote: book.condition_note,
    buyerName: buyerProfile?.name ?? '',
  })
  await supabaseAdmin.from('messages').insert({
    sender_id: user.id,
    receiver_id: sellerId,
    content: `SALE_REQUEST:${msgPayload}`,
    read: false,
  })

  // Notification for seller
  await supabaseAdmin.from('notifications').insert({
    user_id: sellerId,
    type: 'buy_request',
    actor_id: user.id,
    book_id: bookId,
  })

  // Email seller
  const { data: sellerProfile } = await supabaseAdmin
    .from('profiles')
    .select('first_name, name')
    .eq('id', sellerId)
    .single()
  const { data: sellerAuthUser } = await supabaseAdmin.auth.admin.getUserById(sellerId)
  const sellerEmail = sellerAuthUser.user?.email
  if (sellerEmail) {
    const firstName = sellerProfile?.first_name ?? sellerProfile?.name ?? 'there'
    sendEmail({
      to: sellerEmail,
      ...buyRequestEmail(firstName, buyerProfile?.name ?? 'Someone', book.title, message?.trim()),
    }).catch(console.error)
  }

  return NextResponse.json({ saleRequest })
}
