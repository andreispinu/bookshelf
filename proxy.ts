import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { detectLocaleFromHeaders } from '@/lib/locale-detection'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Track last-active once per day per device (drives the weekly friend digest's
  // "inactive for 7 days" rule). A date cookie throttles this to a single DB write
  // per user per day — no read needed on the hot path. RLS "profiles: owner update"
  // (auth.uid() = id) allows the authed client to write its own row. Best-effort.
  if (user) {
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
    if (request.cookies.get('bs_active')?.value !== today) {
      supabaseResponse.cookies.set('bs_active', today, {
        maxAge: 24 * 60 * 60,
        path: '/',
        sameSite: 'lax',
      })
      await supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id)
    }
  }

  const { pathname } = request.nextUrl

  // Auto-detect locale on first visit — only runs when NEXT_LOCALE cookie is absent
  if (!request.cookies.get('NEXT_LOCALE')?.value) {
    const countryCode = request.headers.get('x-vercel-ip-country')
    const acceptLanguage = request.headers.get('accept-language')
    const detected = detectLocaleFromHeaders(countryCode, acceptLanguage)
    supabaseResponse.cookies.set('NEXT_LOCALE', detected, {
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    })
  }

  // Admin routes — restricted to sp_andrei@yahoo.com
  if (pathname.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    if (user.email !== 'sp_andrei@yahoo.com') return NextResponse.redirect(new URL('/books', request.url))
  }

  // Redirect unauthenticated users away from protected routes
  const protectedPrefixes = ['/books', '/friends', '/loans', '/subscribe']
  if (!user && protectedPrefixes.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/books', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
