import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/marketplace — public listing of books for sale across all users.
//
// A book is "for sale" when availability_mode IN ('sell_only','lend_and_sell')
// and status = 'available'. No authentication required.
//
// Query params:
//   q          full-text-ish search on title + author (ilike)
//   category   exact category match
//   country    seller country (ilike)
//   city       seller city (ilike)
//   language   exact language match
//   currency   exact sale_currency match (EUR|USD|GBP|RON|MDL)
//   max_price  upper bound on sale_price
//   page       1-based page number (default 1)
//   limit      page size (default 24, max 60)
//
// Uses the service-role client (bypasses RLS) and selects ONLY safe seller
// columns — mirrors the public profile page pattern, avoids exposing
// sensitive profile fields via the anon key.

const SALE_MODES = ['sell_only', 'lend_and_sell']

// Strip PostgREST `or()` filter metacharacters so user input can't break the query.
function sanitize(s: string): string {
  return s.replace(/[,()*]/g, ' ').trim()
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams

  const q = sanitize(sp.get('q') ?? '')
  const category = sp.get('category')?.trim() || ''
  const country = sp.get('country')?.trim() || ''
  const city = sp.get('city')?.trim() || ''
  const language = sp.get('language')?.trim() || ''
  const currency = sp.get('currency')?.trim() || ''
  const maxPriceRaw = sp.get('max_price')
  const maxPrice = maxPriceRaw != null && maxPriceRaw !== '' ? Number(maxPriceRaw) : null

  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1)
  const limit = Math.min(60, Math.max(1, parseInt(sp.get('limit') ?? '24', 10) || 24))
  const from = (page - 1) * limit
  const to = from + limit - 1

  // Inner join on the seller profile so we can filter by seller country/city
  // and drop any book whose owner profile is missing.
  let query = supabaseAdmin
    .from('books')
    .select(
      `id, title, author, cover_url, category, language, sale_price, sale_currency,
       seller:profiles!books_user_id_fkey!inner(name, avatar_url, city, country, username)`,
      { count: 'exact' }
    )
    .in('availability_mode', SALE_MODES)
    .eq('status', 'available')
    .order('created_at', { ascending: false })

  if (q) query = query.or(`title.ilike.%${q}%,author.ilike.%${q}%`)
  if (category) query = query.eq('category', category)
  if (language) query = query.eq('language', language)
  if (currency) query = query.eq('sale_currency', currency)
  if (maxPrice != null && !Number.isNaN(maxPrice)) query = query.lte('sale_price', maxPrice)
  if (country) query = query.ilike('seller.country', `%${country}%`)
  if (city) query = query.ilike('seller.city', `%${city}%`)

  const { data, error, count } = await query.range(from, to)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Supabase returns the embedded resource as an object for a to-one relation.
  const books = (data ?? []).map((b) => {
    const seller = Array.isArray(b.seller) ? b.seller[0] : b.seller
    return {
      id: b.id,
      title: b.title,
      author: b.author,
      cover_url: b.cover_url,
      category: b.category,
      language: b.language,
      sale_price: b.sale_price,
      sale_currency: b.sale_currency,
      seller: seller
        ? {
            name: seller.name,
            avatar_url: seller.avatar_url,
            city: seller.city,
            country: seller.country,
            username: seller.username,
          }
        : null,
    }
  })

  const total = count ?? 0
  return NextResponse.json({
    books,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  })
}
