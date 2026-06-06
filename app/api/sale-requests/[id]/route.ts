import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { buyAcceptedEmail, buyDeclinedEmail, bookTransferredEmail } from '@/lib/email-templates'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json()
  if (!['accept', 'decline', 'complete'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Get sale request with details
  const { data: saleRequest } = await supabaseAdmin
    .from('sale_requests')
    .select(`
      id, book_id, buyer_id, seller_id, status, sale_price, sale_currency,
      book:books!sale_requests_book_id_fkey(id, title, author, cover_url, isbn, description, publisher, year, category, language, user_id),
      buyer:profiles!sale_requests_buyer_id_fkey(id, name, first_name),
      seller:profiles!sale_requests_seller_id_fkey(id, name, first_name)
    `)
    .eq('id', id)
    .single()

  if (!saleRequest) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if ((action === 'accept' || action === 'decline' || action === 'complete') && saleRequest.seller_id !== user.id) {
    return NextResponse.json({ error: 'Only the seller can perform this action' }, { status: 403 })
  }
  if (action === 'complete' && saleRequest.status !== 'accepted') {
    return NextResponse.json({ error: 'Request must be accepted first' }, { status: 400 })
  }

  const newStatus = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'completed'

  await supabaseAdmin
    .from('sale_requests')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id)

  const book = saleRequest.book as unknown as {
    id: string; title: string; author: string; cover_url: string | null
    isbn: string | null; description: string | null; publisher: string | null
    year: string | null; category: string | null; language: string | null; user_id: string
  }
  const buyer = saleRequest.buyer as unknown as { id: string; name: string; first_name: string | null }
  const seller = saleRequest.seller as unknown as { id: string; name: string; first_name: string | null }

  // Insert SALE_RESPONSE message (seller → buyer)
  await supabaseAdmin.from('messages').insert({
    sender_id: saleRequest.seller_id,
    receiver_id: saleRequest.buyer_id,
    content: `SALE_RESPONSE:${JSON.stringify({ requestId: id, action, bookTitle: book.title })}`,
    read: false,
  })

  // Notification for buyer
  if (action === 'accept' || action === 'decline') {
    await supabaseAdmin.from('notifications').insert({
      user_id: saleRequest.buyer_id,
      type: action === 'accept' ? 'buy_accepted' : 'buy_declined',
      actor_id: saleRequest.seller_id,
      book_id: saleRequest.book_id,
    })
  }

  // Book transfer on complete
  if (action === 'complete') {
    await supabaseAdmin.from('books').insert({
      user_id: saleRequest.buyer_id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      cover_url: book.cover_url,
      description: book.description,
      publisher: book.publisher,
      year: book.year,
      category: book.category,
      language: book.language,
      status: 'available',
      availability_mode: 'lend_only',
    })
    await supabaseAdmin.from('books').delete().eq('id', saleRequest.book_id)
    // Notify buyer
    await supabaseAdmin.from('notifications').insert({
      user_id: saleRequest.buyer_id,
      type: 'book_transferred',
      actor_id: saleRequest.seller_id,
    })
  }

  // Email buyer
  const { data: buyerAuthUser } = await supabaseAdmin.auth.admin.getUserById(saleRequest.buyer_id)
  const buyerEmail = buyerAuthUser.user?.email
  const buyerFirstName = buyer.first_name ?? buyer.name ?? 'there'

  if (buyerEmail) {
    if (action === 'accept') {
      sendEmail({ to: buyerEmail, ...buyAcceptedEmail(buyerFirstName, seller.name, book.title) }).catch(console.error)
    } else if (action === 'decline') {
      sendEmail({ to: buyerEmail, ...buyDeclinedEmail(buyerFirstName, seller.name, book.title) }).catch(console.error)
    } else if (action === 'complete') {
      sendEmail({ to: buyerEmail, ...bookTransferredEmail(buyerFirstName, seller.name, book.title) }).catch(console.error)
    }
  }

  return NextResponse.json({ ok: true })
}
