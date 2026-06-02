# BookShelf — CLAUDE.md

## What this app does

BookShelf is a personal book library app. Users can:
- Create an account and manage their profile
- Add books they own at home
- Add friends (other users)
- Share and lend books between friends

## Tech stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Database + Auth | Supabase (Postgres + Auth) |
| Styling | Tailwind CSS + shadcn/ui |
| Language | TypeScript |
| Hosting | Vercel |

## Deployment

- **Production URL:** https://bookshelf.name
- **GitHub:** https://github.com/andreispinu/bookshelf
- **Supabase project:** https://njyugygdhkegagnapbcy.supabase.co
- Vercel is connected to the `main` branch — every push to `main` triggers a redeploy

## Running locally

```bash
cd "bookshelf"
npm run dev       # http://localhost:3000 (Turbopack, PWA disabled)
npm run build     # production build (webpack, generates service worker)
```

## Project structure

```
/app
  /(auth)               → Login, signup, forgot-password, reset-password pages (public)
  /(dashboard)          → Protected pages (require session)
    /books              → My books list + lend dialog
    /books/add          → Add a book form
    /books/[id]         → Book detail page
    /friends            → Friend search, requests, friends list
    /loans              → Active loans (lent out / borrowed tabs)
    /profile            → Account info, subscription status, plan selection
    /friends/[id]       → Friend's bookshelf (read-only)
    /friends/shelf      → All friends' books combined (search + sort + dedup by ISBN/title)
  /[username]           → Public profile page (no auth required)
  /subscribe            → Paywall (outside dashboard, no redirect loop)
  / (root)              → Landing page (public, no auth required — NOT a redirect)
  /api/users/search     → GET endpoint for user search
  /api/extract-book     → POST multipart image → Claude vision → book data
  /api/stripe/checkout  → POST { priceId } → Stripe Checkout session URL
  /api/stripe/webhook   → Stripe webhook handler
  /api/stripe/portal    → POST → Stripe Customer Portal session URL
  /api/username/check   → GET ?username=xxx → { available: boolean } (uses supabaseAdmin)
  /api/notifications    → GET last 20 notifications | PATCH mark read
  /api/upload-book-cover → POST multipart image → resize 600px → Supabase Storage → { cover_url }
/components/ui          → shadcn/ui components
/lib
  supabase.ts           → Browser client (Client Components)
  supabase-server.ts    → Server client (Server Components + Actions)
  /db
    books.ts            → getBooks()
    friends.ts          → getFriends(), searchUsers()
    loans.ts            → getLentOut(), getBorrowed()
/types/index.ts         → Book, Profile, Friendship, Friend, LoanWithDetails
/supabase/migration.sql → Full DB schema + RLS policies + trigger
/lib/stripe.ts          → Lazy Stripe singleton (getStripe())
proxy.ts                → Session refresh + route protection (Next.js 16)
```

## Database schema

### `profiles`
```sql
id                   uuid  PRIMARY KEY REFERENCES auth.users(id)
name                 text  NOT NULL  -- kept in sync as trim(first_name || ' ' || last_name) by DB trigger
first_name           text  -- nullable (populated for all users after add-first-last-name.sql migration)
last_name            text  -- nullable, optional
avatar_url           text
created_at           timestamptz DEFAULT now()
trial_ends_at        timestamptz
stripe_customer_id   text
stripe_subscription_id text
subscription_status  text DEFAULT 'trialing'
subscription_plan    text
subscription_ends_at timestamptz
username             text UNIQUE  -- ^[a-z0-9-]{3,30}$
profile_visibility   text DEFAULT 'private'  -- 'private' | 'public_minimal' | 'public_full'
country              text  -- nullable, clean country name from lib/countries.ts
city                 text  -- nullable, free-text city name
```

### `books`
```sql
id          uuid    PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
title       text    NOT NULL
author      text    NOT NULL
isbn        text
cover_url   text
status      text    NOT NULL DEFAULT 'available'  -- 'available' | 'lent_out'
created_at  timestamptz DEFAULT now()
```

### `friendships`
```sql
id             uuid  PRIMARY KEY DEFAULT gen_random_uuid()
requester_id   uuid  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
addressee_id   uuid  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
status         text  NOT NULL DEFAULT 'pending'  -- 'pending' | 'accepted' | 'declined'
created_at     timestamptz DEFAULT now()
UNIQUE(requester_id, addressee_id)
```

### `loans`
```sql
id           uuid  PRIMARY KEY DEFAULT gen_random_uuid()
book_id      uuid  NOT NULL REFERENCES books(id) ON DELETE CASCADE
lender_id    uuid  NOT NULL REFERENCES profiles(id)
borrower_id  uuid  NOT NULL REFERENCES profiles(id)
loaned_at    timestamptz DEFAULT now()
returned_at  timestamptz  -- NULL until returned
```

## Coding conventions

- **Always use TypeScript** — no `any` types unless absolutely necessary
- **Server Actions over API routes** — use Next.js server actions for all data mutations
- **Supabase server client** — always use the server-side Supabase client in server components and actions (never the browser client for sensitive operations)
- **Row Level Security (RLS)** — all tables must have RLS enabled in Supabase; users can only read/write their own data
- **Error handling** — all server actions return `{ data, error }` — never throw, always return
- **Component naming** — PascalCase for components, camelCase for functions and variables
- **File naming** — kebab-case for files (e.g. `add-book-form.tsx`)
- **Co-location** — keep components close to the page that uses them; only move to `/components` if used in 2+ places
- **Translations — ALWAYS add to all three files simultaneously** — every new UI string must be added to `messages/en.json`, `messages/ro.json`, AND `messages/ru.json` at the same time. Never add a key to only one file. JSON does not support comments, so this rule lives here. Namespaces: `auth` (login/signup), `books`, `friends`, `messages`, `loans`, `profile`, `notifications`, `nav`, `common`, `landing` (landing page + public profile page).

## Auth conventions

- Supabase Auth handles sign up, login, and session management
- Protected routes live under `/app/(dashboard)` and check for a session in the layout
- The current user is accessed via `supabase.auth.getUser()` — never trust the client-side session for server operations
- After sign up, a `profiles` row is created automatically via a Supabase database trigger

### Forgot password flow
1. User clicks "Forgot password?" on the login page → `/forgot-password`
2. They enter their email; the page calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://bookshelf.name/reset-password' })` using the **browser client** (`lib/supabase.ts`)
3. Always shows success message regardless of whether the email exists (security)
4. Supabase emails a magic link → user clicks it → lands on `/reset-password` with a recovery token in the URL hash
5. The browser Supabase client picks up the token automatically; the page calls `supabase.auth.updateUser({ password })` to set the new password
6. On success: shows a toast and redirects to `/books`

**Supabase dashboard setup (one-time):**
- Authentication → URL Configuration → Add `https://bookshelf.name/reset-password` to allowed redirect URLs
- Authentication → Email Templates → Reset Password: confirm the `{{ .ConfirmationURL }}` variable is present (default template is fine)

**Files:**
- `app/(auth)/forgot-password/page.tsx` — email form, calls resetPasswordForEmail
- `app/(auth)/reset-password/page.tsx` — new password form, calls updateUser

## Subscription system

### Plans
| Plan | Price | Stripe Price ID env var |
|------|-------|------------------------|
| Monthly | $1/month | `STRIPE_MONTHLY_PRICE_ID` |
| Annual | $10/year | `STRIPE_ANNUAL_PRICE_ID` |

Free trial: 14 days from signup, full access, no card required.

### How it works
1. On signup, the DB trigger sets `trial_ends_at = now() + 14 days` and `subscription_status = 'trialing'`
2. The dashboard layout checks on every page load: is trial still active OR is subscription active?
3. If neither → redirect to `/subscribe`
4. If trialing with ≤ 3 days left → amber banner with countdown + subscribe link
5. User subscribes via Stripe Checkout (hosted page, no custom card form)
6. Stripe webhook updates `subscription_status → 'active'` in the profiles table

### Access control (dashboard layout)
```typescript
const isTrialing = status === 'trialing' && trial_ends_at > now
const isActive = status === 'active'
if (!isTrialing && !isActive) redirect('/subscribe')
```

### Files
- `lib/stripe.ts` — Stripe server client (API version `2026-05-27.dahlia`)
- `app/subscribe/page.tsx` — Paywall page. Lives **outside** `(dashboard)` to avoid redirect loop. Two pricing cards (Monthly / Annual highlighted as "Best value")
- `app/api/stripe/checkout/route.ts` — `POST { priceId }` → creates Stripe Checkout session → returns `{ url }`
- `app/api/stripe/webhook/route.ts` — handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### Stripe setup (one-time)
1. Create two products in the Stripe dashboard with recurring prices ($1/month and $10/year)
2. Copy the price IDs into env vars
3. Create a webhook endpoint pointing to `https://bookshelf.name/api/stripe/webhook`
4. Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`

### Webhook note
`current_period_end` moved to `subscription.items.data[0].current_period_end` in Stripe API v2026 (was previously on the top-level subscription object).

### Database fields (profiles table)
Run `supabase/add-subscription-fields.sql`:
- `trial_ends_at` — timestamptz, set by trigger on signup
- `stripe_customer_id` — text
- `stripe_subscription_id` — text
- `subscription_status` — text DEFAULT 'trialing' (`trialing` | `active` | `canceled` | `past_due`)
- `subscription_plan` — text (`monthly` | `annual` | null)
- `subscription_ends_at` — timestamptz (current billing period end)

## Features

### Add book button
The "Add a book ⌄" button on `/books` opens a dropdown with two options:
- **Add manually** (pencil icon) — navigates to `/books/add`
- **Add with AI** (camera icon, dark background) — opens the photo/AI scan modal

**File:** `app/(dashboard)/books/photo-button.tsx` — exports `AddBookButton`, owns both the dropdown state and the photo modal open/close state. No new dependencies — uses lucide-react icons and an inline click-outside handler.

### Add book by photo (AI scan)
Allows users to scan a book cover (and optionally the back cover/verso) to extract book details with Claude.

**Flow:**
1. User clicks "Add a book" → "Add with AI"
2. Modal shows two slots side by side: **Front cover** (required) and **Back cover (optional)**
3. Each slot has "Take photo" (rear camera) + "Upload" buttons; back cover shows a ✕ to remove once added
4. Both images are resized client-side to max 1024px (canvas + `toBlob`) before upload
5. `POST /api/extract-book` sends `coverImage` (required) + `versoImage` (optional) as multipart
6. On success: navigates to `/books/add?title=...&author=...` with pre-filled form
7. On failure: toast "Couldn't read the cover, please fill in manually" + opens empty form

**Files:**
- `app/api/extract-book/route.ts` — receives multipart `coverImage` + optional `versoImage`, calls Anthropic, returns JSON
- `app/(dashboard)/books/photo-modal.tsx` — two-slot dialog UI, resizes both images, handles navigation
- `app/(dashboard)/books/photo-button.tsx` — owns the photo modal open/close state
- `app/(dashboard)/books/add/add-book-form.tsx` — form client component, reads `useSearchParams()` for pre-fill

**AI model:** `claude-opus-4-5` via `@anthropic-ai/sdk`

**Single cover prompt:** extracts title, author, ISBN, publisher, year, category, language, description from Claude's knowledge.

**Dual cover prompt (front + verso):** extracts same fields but with enhanced context:
- ISBN from barcode on back cover (more reliable than front)
- Description from back cover blurb (up to 100 words, in the book's language)
- Category inferred from the blurb text (more accurate than cover alone)
- Language detected from both covers

**Error handling:** JSON parse failures and API errors both fall through to an empty form with a sonner toast.

### Cover photo from scan
When a book is added via photo scan, the front cover image is uploaded as the book's cover:
- Server receives the front cover (already resized to 1024px by the client)
- `sharp` resizes it to max 400px wide on the server
- Uploaded to Supabase Storage bucket `book-covers` under `{userId}/{timestamp}.jpg`
- Public URL saved to `cover_url` field and pre-filled in the add form
- The verso image is never used as the cover — only for data extraction
- Upload uses `supabaseAdmin` (service role) so no storage write policies are needed

**Storage bucket:** `book-covers` — public bucket. Run `supabase/create-book-covers-bucket.sql` in the SQL editor to create it.

### Duplicate detection
Before any book is saved (`addBook` server action), a case-insensitive check queries for an existing book with the same `title` AND `author` for the current user. If found:
- Server action returns `{ duplicate: true }` instead of inserting
- The add form detects this and shows a dialog: "You already have this book on your shelf"
- "Add anyway" calls `addBookForce()` which skips the check and inserts directly
- "Cancel" dismisses the dialog and returns to the form

### Book list actions
Each row in the book list shows: status badge, **View** button (navigates to detail page), and **⋯** button. The ⋯ dropdown contains:
- **Lend** — disabled/grayed when `status === 'lent_out'`
- **Edit** — opens edit dialog inline
- **Delete** — red text, disabled while deleting

Implemented as a `BookMenu` component inside `book-list.tsx` using a local `open` state and a click-outside `useEffect`. No external dropdown library.

### Book detail page
Route: `/books/[id]` — dedicated page for a single book.

Shows:
- Large cover image (if available) alongside title, author, status badge
- If lent out: borrower name and date lent
- Publisher, year, ISBN in a metadata grid
- Full description
- Edit (opens dialog) and Delete buttons

**Files:** `app/(dashboard)/books/[id]/page.tsx` (server), `app/(dashboard)/books/[id]/book-detail-actions.tsx` (client — edit dialog + delete)

### Profile page
Route: `/profile` — account info and subscription management.

**Sections:**
1. **Account** — avatar circle (initials), name, email, Edit name button (dialog, calls `updateName` server action)
2. **Subscription status** — one of three states:
   - **Free Trial** (amber badge): days remaining, trial end date, "After your trial ends…" message, "View plans ↓" button (scrolls to plans section)
   - **Active** (green badge): plan name (Monthly/Annual), next billing date, amount, "Manage subscription →" button (calls `/api/stripe/portal` → redirects to Stripe Customer Portal)
   - **Expired** (red badge): expired message, "Subscribe now ↓" button (scrolls to plans)
3. **Plans** — two cards (Monthly $1/mo, Annual $10/yr with "Best value" badge). Subscribe buttons call `/api/stripe/checkout`. Current plan button is disabled when already subscribed to that plan.

**Files:**
- `app/(dashboard)/profile/page.tsx` — server component, fetches full profile + passes price IDs from server env
- `app/(dashboard)/profile/profile-client.tsx` — all interactive UI
- `app/(dashboard)/profile/actions.ts` — `updateName()` server action
- `app/api/stripe/portal/route.ts` — POST → creates Stripe billing portal session → returns `{ url }`

**Nav:** Avatar in the top-right nav is now a dropdown with "Profile" and "Sign out" (click-outside to close).

### Public profile & username
Users can set a username and choose a visibility level to share their profile publicly.

**Database fields** (run `supabase/add-username-visibility.sql`):
- `username` — text UNIQUE, nullable, format `^[a-z0-9-]{3,30}$`, indexed
- `profile_visibility` — text DEFAULT `'private'` (`'private'` | `'public_minimal'` | `'public_full'`)

**Profile page — Public Profile section** (`username-section.tsx`):
- Username input with 500ms debounced availability check via `GET /api/username/check`
- Live indicator: spinner while checking, green ✓ if available, red ✗ if taken/invalid
- Once saved: shows `bookshelf.name/[username]` with copy and open buttons
- Visibility selector — three radio-style cards (auto-save on click, no separate button):
  - **Private** (lock icon) — no public page, 404 if visited
  - **Public minimal** (eye icon) — shows name, avatar, book count only
  - **Public full** (library icon) — shows name, avatar, full book list with covers and status

**Public profile page** (`app/[username]/page.tsx`):
- Outside `(dashboard)`, no auth required
- Fetches profile + books via `supabaseAdmin` (bypasses RLS)
- `private` → `notFound()` (404)
- `public_minimal` → name, avatar initials, book count sentence
- `public_full` → same 2-col card / list layout as friend shelf page
- Page title: `[Name]'s BookShelf`
- Footer: "Powered by BookShelf"
- Route catches any single-segment path not matched by a specific route

**Files:**
- `supabase/add-username-visibility.sql` — migration
- `app/(dashboard)/profile/username-section.tsx` — client component
- `app/(dashboard)/profile/actions.ts` — `updateUsername()`, `updateProfileVisibility()`
- `app/api/username/check/route.ts` — availability check endpoint
- `app/[username]/page.tsx` — public profile page

### Friend's book detail
Route: `/friends/[id]/books/[bookId]` — full detail view of a single book from a friend's shelf.

Verifies accepted friendship first (same check as `/friends/[id]`). Fetches profile + book via `supabaseAdmin` in parallel. Shows: large cover, title/author, status badge, "Currently lent out" note if lent, "Request to borrow" BorrowButton if available, metadata grid (publisher, year, ISBN, language, category), description. Back link: "← Back to {name}'s shelf".

**File:** `app/(dashboard)/friends/[id]/books/[bookId]/page.tsx`

### Friend's bookshelf
Route: `/friends/[id]` — read-only view of an accepted friend's book collection.

**Access control:** Verifies an accepted friendship row exists before rendering. Returns 404 if not friends or friendship is pending/declined. The existing RLS policy on `books` already allows accepted friends to read each other's books.

**Layout:**
- Header: avatar circle (initials), friend's name, "Member since" date
- Book count subtitle
- Responsive list: 2-column card grid on mobile (`grid grid-cols-2`), horizontal list rows on desktop (`sm:block sm:divide-y`)
- Each book: cover image or 📖 placeholder, title, author, status badge
- "Request to borrow" button on available books — shows a "Coming soon" toast (borrow requests not yet built)

**Friends list:** Accepted friend rows now have:
- Name + avatar wrapped in a `<Link href="/friends/[id]">` (hover effect)
- "View shelf" text link next to each accepted friend

**Files:**
- `app/(dashboard)/friends/[id]/page.tsx` — server component, friendship check + profile + books fetch
- `app/(dashboard)/friends/[id]/borrow-button.tsx` — client component for the "Request to borrow" toast
- `app/(dashboard)/friends/friend-list.tsx` — updated to add links

### Landing page
Route: `/` — public marketing page, no auth required. Replaces the old redirect to `/books`. Fully multilingual (EN/RO/RU).

**Sections (in order):**
1. **Nav** — "BookShelf" logo left; center links: Books (#recent-books), Features, How it works, Install, Pricing; "Log in" + "Start free trial" right. If user is already logged in, shows "Go to my shelf" instead.
2. **Hero** — headline, subheadline, two CTAs ("Start free trial" dark primary, "See how it works" ghost scrolls to `#how-it-works`), note "Free for 14 days. No credit card required."
3. **Recently Added Books** — only shown if ≥ 3 books with a cover exist. Fetches up to 1000 most recent books from **all** users regardless of `profile_visibility` via `supabaseAdmin` (bypasses RLS). Shows only cover image, title, category pill, and availability badge — **no author, no owner name, no link to owner** (privacy preserved). Client component (`app/recently-added-client.tsx`) handles category filtering: pills for categories with ≥ 5 books, sorted by count descending, horizontally scrollable on mobile. "All (N)" pill shows total count. Selecting a category shows up to 10 most recent books in it; if a category has < 10 books (but ≥ 5), all are shown. No pills shown if no category has ≥ 5 books.
4. **Features** — 3-column grid (stacked mobile): Add your library (AI scan), Lend to friends (track loans), Always with you (PWA).
4. **How it works** (`id="how-it-works"`) — 4 numbered steps: Create account → Add books → Add friends → Start lending.
5. **Pricing** — 3 cards: Free trial ($0/14 days), Monthly ($1/mo), Annual ($10/yr with "Best value" badge). All CTAs link to `/signup`.
6. **Footer** — "BookShelf" branding, links (Log in, Sign up, bookshelf.name), `© {year} BookShelf` (dynamic, never hardcoded).

**Files:**
- `app/page.tsx` — server component, checks Supabase session to conditionally show "Go to my shelf" vs sign-up buttons. Features grid (12 cards) and steps array built dynamically from translation keys. Should be kept in sync when new features are added.
- `app/recently-added-client.tsx` — client component for Recently Added Books section; handles category filter pills and book display
- `app/landing-nav.tsx` — `'use client'` component. Includes EN/RO/RU language switcher (pill buttons). Accepts `currentLocale` prop from `page.tsx` (via `getLocale()`). Calls `setLocale()` server action on language change.
- `app/landing-actions.ts` — `setLocale(lang)` server action: sets `NEXT_LOCALE` cookie, also saves `ui_language` to DB if user is logged in. Works without authentication (cookie-only fallback).

**Language switcher behavior:** Always sets `NEXT_LOCALE` cookie. If user is logged in, also saves to their `profiles.ui_language`. `router.refresh()` triggers re-render with new locale.

### All Friends' Bookshelves
Route: `/friends/shelf` — combined view of every book owned by all accepted friends.

**Tab strip** (`friends-tabs.tsx`): appears at the top of both `/friends` and `/friends/shelf`, styled as pill tabs (active = `bg-stone-100`). Server component, receives `active: 'friends' | 'shelf'` prop.

**Data flow (server component `shelf/page.tsx`):**
1. Fetch accepted friends via `getFriends()`
2. Query `books` with `.in('user_id', friendIds)` — RLS allows reading friends' books
3. Group books by dedup key: `isbn:<value>` if ISBN present, else `title:<normalized>|<author_normalized>` (lowercase + trimmed)
4. A group with 2+ copies means multiple friends own the same book
5. Pass `BookGroup[]` to `ShelfClient`

**`ShelfClient` (client component `shelf/shelf-client.tsx`):**
- Search bar: filters by title or author (case-insensitive)
- Sort dropdown: Recently added (default) | Title A–Z | Most popular (most copies first)
- For single-owner book: avatar + name + status badge inline
- For multi-owner book: stacked avatars (max 3 shown) + "X friends have this" toggle button → expands to list each friend with their own status badge

**Types** (exported from `shelf-client.tsx`): `FriendInfo`, `BookCopy`, `BookGroup`

**Empty states:**
- No accepted friends → "Add friends to see their books here"
- Friends exist but no books → "Your friends haven't added any books yet"
- No search matches → "No books match your search"

**Files:**
- `app/(dashboard)/friends/friends-tabs.tsx` — shared tab strip
- `app/(dashboard)/friends/shelf/page.tsx` — server component (data fetch + grouping)
- `app/(dashboard)/friends/shelf/shelf-client.tsx` — client component (search, sort, render)
- `app/(dashboard)/friends/page.tsx` — updated to include FriendsTabs

### People you may know (friend suggestions)
A "People you may know" section appears at the bottom of `/friends` (below the friends list) when there is at least 1 suggestion. Hidden entirely when empty.

**Algorithm (`getFriendSuggestions` in `lib/db/friends.ts`):**
1. Fetch all my friendships (any status) → build exclusion set (myself + anyone I've ever connected with) + accepted friend list
2. Fetch all accepted friendships of my accepted friends via `supabaseAdmin` (bypasses RLS which only allows users to see their own friendships)
3. For each friendship row, if one side is my friend and the other is not excluded → increment mutual count for the other person
4. Sort by mutual count desc, take top 10, join with profiles

**Display (`suggestions-client.tsx`):**
- Responsive grid: `grid-cols-2 sm:grid-cols-3`
- Each card: avatar, name, country flag+name, "N mutual friend(s)", "Add friend" button
- After clicking "Add friend": button immediately switches to "Pending" (disabled) — tracked via local `pendingIds` Set
- Calls existing `sendFriendRequest()` server action

**Files:**
- `lib/db/friends.ts` → `getFriendSuggestions(userId)` + exported `FriendSuggestion` type
- `app/(dashboard)/friends/suggestions-client.tsx` — card grid client component
- `app/(dashboard)/friends/page.tsx` — fetches suggestions in parallel with friends, renders section

**Translation keys added to `friends` namespace:** `peopleYouMayKnow`, `mutualFriends` (ICU plural)

### In-app notifications
Users receive notifications for friend activity. A bell icon in the nav shows the unread count and opens a dropdown panel.

**Database table: `notifications`** (run `supabase/add-notifications.sql`):
```sql
id         uuid        PRIMARY KEY DEFAULT gen_random_uuid()
user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
type       text        NOT NULL  -- 'friend_request' | 'friend_accepted' | 'friend_new_book'
actor_id   uuid        REFERENCES profiles(id)   -- who triggered it
book_id    uuid        REFERENCES books(id)       -- nullable, only for friend_new_book
read       boolean     DEFAULT false
created_at timestamptz DEFAULT now()
```

**Triggers (automatic, no app code needed):**
| Trigger | Event | Recipient | Type |
|---------|-------|-----------|------|
| `on_friend_request` | INSERT friendships (status=pending) | addressee_id | `friend_request` |
| `on_friend_accepted` | UPDATE friendships (pending→accepted) | requester_id | `friend_accepted` |
| `on_new_book` | INSERT books | all accepted friends of book owner | `friend_new_book` |
| `on_new_message` | INSERT messages | receiver_id | `new_message` — skips borrow_request JSON; upserts (bumps created_at if unread notification from same actor already exists) |

**Nav bell** (`app/(dashboard)/notifications-bell.tsx`):
- Polls `GET /api/notifications` every 60 seconds + on mount
- Red badge shows unread count (capped at "9+")
- Dropdown (320px, max-h 384px scrollable): avatar, message text, time ago, unread dot + amber highlight
- Clicking a notification: marks read (optimistic), navigates to `/friends` or `/friends/[actorId]` for new books
- "Mark all as read" button clears all unread

**API route** (`app/api/notifications/route.ts`):
- `GET` — returns last 20 notifications with joined actor (name, avatar_url) and book (title)
- `PATCH { id }` — marks single notification read
- `PATCH { all: true }` — marks all as read

**Files:**
- `supabase/add-notifications.sql` — table + RLS + 3 trigger functions
- `app/api/notifications/route.ts` — GET + PATCH
- `app/(dashboard)/notifications-bell.tsx` — bell icon + dropdown client component
- `app/(dashboard)/nav.tsx` — imports NotificationsBell, placed between nav links and account menu

### Public profile CTA
At the bottom of every public profile page (`app/[username]/page.tsx`), above the "Powered by BookShelf" footer, there is a subtle CTA card:
- Heading: "Discover your own bookshelf"
- Subtext: "Track your books, connect with friends, and lend your favourites."
- Button: "Try BookShelf free" → `https://bookshelf.name`

### Location (country & city)
Users can set their country and city on their profile.

**Database fields** (run `supabase/add-location.sql`):
- `country` — text, nullable, clean name from `lib/countries.ts`
- `city` — text, nullable, free-text

**Profile page — Location section** (`location-section.tsx`):
- Searchable country dropdown: type to filter the full world country list, click to select, ✕ to clear
- City text input: appears after a country is selected; free-text, placeholder shows the country name
- "Save location" button — disabled until a change is made, success toast on save
- Server action: `updateLocation(country, city)` in `profile/actions.ts`

**Country list** (`lib/countries.ts`):
- Sourced from `country-list` npm package (ISO 3166-1), cleaned up with `OVERRIDES` map for user-friendly names
- Exports `COUNTRIES: string[]` (sorted A–Z) and `COUNTRY_FLAGS: Record<string, string>` (country name → flag emoji via Unicode regional indicators)
- `codeToFlag(code)` — converts ISO alpha-2 code to flag emoji

**Public profile page** (`app/[username]/page.tsx`):
- Shows `City, Country 🏳️` below the book count if either field is set (public_minimal and public_full)
- Uses `MapPin` icon from lucide-react

**Friends list** (`friend-list.tsx`):
- Shows the country flag emoji next to the accepted friend's name if their country is set
- Uses `COUNTRY_FLAGS` from `lib/countries.ts`

### Book language field
Books have an optional `language` field from a fixed list of 21 languages.

**Predefined list** (`lib/languages.ts`): English, Romanian, French, Spanish, German, Italian, Portuguese, Dutch, Russian, Polish, Swedish, Norwegian, Danish, Arabic, Chinese, Japanese, Korean, Hebrew, Turkish, Czech, Hungarian

**Database** (run `supabase/add-language.sql`): `ALTER TABLE books ADD COLUMN IF NOT EXISTS language text`

Language appears in:
- Add book form: dropdown after Category, pre-filled from AI scan
- Edit book dialog: dropdown alongside Category (side-by-side grid)
- AI book scan: Claude detects language from cover text/title/author
- Fill with AI: Claude identifies language from title/author knowledge
- Description generation: always written in the book's language (if known), else English

### Fill with AI (inline — add form)
The manual add book form (`/books/add`) has a "Fill with AI" button inline next to the Title field label. It appears always but is only active (clickable) when the title has ≥ 3 characters. Clicking it calls `POST /api/fill-book-title` with `{ title, author? }`. Claude returns `{ author, isbn, publisher, year, category, language, description, cover_url }`. Only empty fields are filled; already-typed values are never overwritten. Shows a Sparkles icon (Loader2 spinner while loading). Toast feedback: "Fields filled by AI — review before saving", "Couldn't find this book — please fill in manually", or "Add more details to the title for better results". The form uses controlled state (useState `fields` object) to enable programmatic updates.

**Files:**
- `app/api/fill-book-title/route.ts` — POST `{ title, author? }` → calls Claude → returns `{ suggested }` or `{ error: 'not_found' | 'ambiguous' }`

### Fill with AI (book detail — ⋯ menu)
Each book's ⋯ menu has a "Fill with AI" option that uses Claude to look up missing metadata.

**Flow:**
1. Click "Fill with AI" → dialog opens with spinner ("Looking up book details…")
2. `POST /api/fill-book` is called with `{ bookId }`
3. Server fetches book (ownership check), calls Claude with title + author + isbn
4. Response: suggestions for isbn, publisher, year, category, language, description, cover_url
5. Dialog shows each suggested field with:
   - Field label (all caps, small)
   - Current value (strikethrough, muted) if one exists
   - New suggested value (bold)
   - Checkbox: auto-checked if field is currently empty, unchecked if it would override existing data
6. "Apply N fields" button saves only the checked suggestions via `fillBookFields()` server action
7. Book list updates optimistically; no page redirect

**Cover URL strategy:**
- If ISBN is known (from book or from Claude's response): always use OpenLibrary: `https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg`
- If no ISBN: Claude suggests a URL if confident; null otherwise
- Cover preview renders in the dialog (with `onError` hiding broken images)

**Files:**
- `app/api/fill-book/route.ts` — POST handler, calls Claude, applies OpenLibrary logic
- `app/(dashboard)/books/actions.ts` → `fillBookFields(bookId, fields)` — partial update, no redirect

### AI book scanning — enhanced prompt
`app/api/extract-book/route.ts` now extracts all fields from the cover image:
- title, author, isbn, publisher, year, category, language, description, cover_url
- **Cover priority:** ISBN extracted → OpenLibrary URL; Claude suggests URL for well-known books; uploaded photo as last fallback
- Description written in the book's language (detected from cover), or English
- Language detected from cover text, title, and author name

### Book categories
Books have an optional `category` field chosen from a fixed list of 22 genres.

**Predefined list** (`lib/categories.ts`):
Fiction, Non-Fiction, Science Fiction, Fantasy, Mystery & Thriller, Biography & Memoir, History, Science & Technology, Self-Help & Personal Development, Business & Economics, Philosophy, Psychology, Romance, Children & Young Adult, Travel, Art & Design, Poetry, Religion & Spirituality, Health & Wellness, Cooking, Governance & Politics, School Books

**Database** (run `supabase/add-category.sql`): `ALTER TABLE books ADD COLUMN IF NOT EXISTS category text`

**AI auto-assignment:** The Claude prompt in `app/api/extract-book/route.ts` instructs Claude to pick exactly one category from the list. The category is returned in the JSON response alongside title/author/etc., passed via URL param `?category=...` to the add form, and pre-selected in the dropdown (user can change it).

**Forms:**
- Add book form (`/books/add`): category dropdown with "No category" blank option at top
- Edit book dialog (`book-list.tsx`): same dropdown, pre-filled with existing category
- Server action (`books/actions.ts`): `extractFields()` reads `category` from FormData, saves as null if blank

**Books page filter:** When ≥1 book has a category, a pill filter bar appears above the list. Pills show "All (N)" + one pill per category with count, e.g. "Fiction (3)" (ordered by the canonical CATEGORIES list). Count is shown in muted `text-stone-400` (or `opacity-75` when pill is active). Active pill: `bg-stone-800 text-white`. Clicking active pill deselects (returns to All).

**Category badge:** Shows as a muted `text-xs text-stone-400` line under the author name on:
- My Books list (`book-list.tsx`) — also has category filter pills with counts
- Friend's bookshelf (`/friends/[id]`) — `FriendShelfClient` handles category filter pills with counts (client component, created to enable interactivity on the server-rendered page)
- Public profile (`/[username]`) — `PublicShelf` client component has category filter pills with counts
- Combined shelf (`/friends/shelf`) — also has category filter pills

### Description field
Books now have an optional `description` field (text). Added to:
- `books` table via `supabase/add-description.sql`
- Add book form (pre-filled by photo scan or typed manually)
- Edit book dialog

### Messaging
Users can send direct messages to friends.

**Database table: `messages`** (run `supabase/add-messages-borrow-requests.sql`):
```sql
id          uuid        PRIMARY KEY DEFAULT gen_random_uuid()
sender_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
receiver_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
content     text        NOT NULL
read        boolean     DEFAULT false
created_at  timestamptz DEFAULT now()
```
RLS: participant read (sender OR receiver), sender insert, receiver update.

**Page:** `/messages` — two-panel layout (conversation list left, chat right). On mobile: full-screen chat when a conversation is open, back arrow returns to list. The active conversation is tracked via `?with=<userId>` URL param.
- Conversations list shows avatar, name, last message, time ago, unread badge
- Chat shows message bubbles: sent = stone-800 right, received = stone-100 left
- Optimistic send; polls every 10 seconds; marks received messages read on open
- Enter to send (Shift+Enter for newline)

**Nav badge:** "Messages" link shows red badge with unread count, polled every 30s via `/api/nav-counts`.

**API routes:**
- `GET /api/messages?with=<userId>` — fetch conversation messages
- `POST /api/messages` — send `{ receiverId, content }`
- `PATCH /api/messages` — mark read `{ senderId }`
- `GET /api/messages/conversations` — grouped conversation list
- `GET /api/nav-counts` — `{ unreadMessages, pendingRequests }` for nav badges

**Files:**
- `app/(dashboard)/messages/page.tsx` — server wrapper (Suspense for useSearchParams)
- `app/(dashboard)/messages/messages-client.tsx` — full UI client component
- `app/(dashboard)/messages/borrow-card.tsx` — `BorrowRequestCard`, `BorrowResponseCard`, `parseBorrowPayload`

**Borrow message cards:** Borrow-related messages are stored as JSON in `messages.content`. `parseBorrowPayload()` detects them (fast-path: `content.startsWith('{')`). Two card types:
- `type: 'borrow_request'` — shows book cover, title/author, pending badge, Approve/Decline buttons for the owner (hidden if already responded or it's the requester's own view)
- `type: 'borrow_response'` — shows green (approved) or red (declined) outcome card

Owner can approve/reject directly from the chat by clicking the card buttons, which calls `PATCH /api/borrow-requests`. The `respondedRequestIds` set (computed via `useMemo`) tracks which requests already have a response so the action buttons are hidden.

### Borrow requests
Users can request to borrow a specific book from a friend's shelf. Owners can approve or decline.

**Database table: `borrow_requests`** (same migration file):
```sql
id                uuid        PRIMARY KEY DEFAULT gen_random_uuid()
book_id           uuid        NOT NULL REFERENCES books(id) ON DELETE CASCADE
requester_id      uuid        NOT NULL REFERENCES profiles(id)
owner_id          uuid        NOT NULL REFERENCES profiles(id)
status            text        NOT NULL DEFAULT 'pending'  -- 'pending' | 'approved' | 'rejected'
requester_message text        -- optional message from requester
owner_message     text        -- optional message from owner on approve/reject
created_at        timestamptz DEFAULT now()
updated_at        timestamptz DEFAULT now()
```
RLS: participant read, requester insert, owner update.

**Requester flow:**
1. Click "Request to borrow" on any available book on a friend's shelf
2. Modal opens with optional message field
3. POST /api/borrow-requests → creates row + sends notification to owner
4. Success toast

**Owner flow:**
1. Receives `borrow_request` notification (bell) → navigate to `/loans/requests`
2. Nav "Loans" link shows pending count badge
3. `/loans/requests` page: list of pending incoming requests with book cover, requester avatar, optional message
4. Approve → creates loan + sets book to `lent_out` + notifies requester (`borrow_approved`)
5. Decline → updates status + notifies requester (`borrow_rejected`)

**Loans page tabs:** "Lent out" | "Borrowed" | "Requests" — Requests tab shows all sent requests with status badges (Pending/Approved/Declined). Link to `/loans/requests` for incoming.

**Notification types added:** `borrow_request` (→ `/loans/requests`), `borrow_approved` (→ `/loans?tab=requests`), `borrow_rejected` (→ `/loans?tab=requests`), `new_message` (→ `/messages?with={actorId}`)

**API route:** `app/api/borrow-requests/route.ts` — GET pending incoming, POST create, PATCH approve/reject. Uses `supabaseAdmin` for all DB operations. POST always inserts a `borrow_request` JSON card into `messages`; PATCH always inserts a `borrow_response` JSON card.

**Files:**
- `app/(dashboard)/friends/[id]/borrow-button.tsx` — modal with book props (bookId, bookTitle, ownerId)
- `app/(dashboard)/loans/requests/page.tsx` + `requests-client.tsx` — incoming requests UI
- `app/(dashboard)/loans/loan-list.tsx` — updated with Requests tab + `sentRequests` prop
- `app/(dashboard)/loans/page.tsx` — fetches sent requests, passes `defaultTab` from searchParams

### Email notifications
Transactional emails are sent via **Resend** (domain: bookshelf.name, from: noreply@bookshelf.name). All sends are fire-and-forget — never awaited in the request handler, always `.catch(console.error)` so failures never break the main flow.

**Files:**
- `lib/email.ts` — `sendEmail({ to, subject, html })` wrapper around the Resend SDK
- `lib/email-templates.ts` — three template functions returning `{ subject, html }`:
  - `friendRequestEmail(senderName)`
  - `newMessageEmail(senderName, preview)`
  - `borrowRequestEmail(requesterName, bookTitle, message?)`
- Templates use inline HTML/CSS with the BookShelf stone brand (Georgia serif, stone-800 background CTA button, warm grey palette)
- Recipient email fetched via `supabaseAdmin.auth.admin.getUserById(userId)` (only auth.users has email)

**Three triggers:**

| Event | File | Recipient | Debounce |
|-------|------|-----------|----------|
| Friend request sent | `app/(dashboard)/friends/actions.ts` → `sendFriendRequest()` | Addressee | None |
| Message sent | `app/api/messages/route.ts` → POST | Receiver | Skip if unread `new_message` notification from same sender already exists |
| Borrow request created | `app/api/borrow-requests/route.ts` → POST | Book owner | None |

**Message email debounce:** Before sending, checks if a `new_message` notification already exists (`read = false`, same `actor_id`) — if so, user is likely actively chatting and email is skipped. Also skips JSON borrow card messages (content starts with `{`).

### Bookstore (Wishlist)
Users can maintain a wishlist of books they want to read or buy. When adding a book, the app immediately checks if any accepted friend owns it.

**Route:** `/bookstore`

**Database table: `wishlist`** (run `supabase/add-wishlist.sql`):
```sql
id              uuid        PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
title           text        NOT NULL
author          text        NOT NULL
isbn            text
cover_url       text
category        text
language        text
description     text
status          text        NOT NULL DEFAULT 'wanted'  -- 'wanted' | 'borrowed' | 'purchased'
has_friend_copy boolean     NOT NULL DEFAULT false
created_at      timestamptz DEFAULT now()
```
RLS: user can read/insert/update/delete only their own rows.

**Add flow:**
1. "Add a book" dropdown: Add manually (`/bookstore/add`) or Add with AI (photo scan → `/bookstore/add?params`)
2. User fills/reviews form (title, author, ISBN, category, language, description)
3. On submit: `addToWishlistAndCheck(data)` inserts row AND checks friend availability
4. If any friend owns the book: sets `has_friend_copy = true` on the row
5. Shows result modal immediately — either "Added\! No friends have this yet" or friend list with borrow buttons

**Friend availability check (`checkFriendAvailability` in actions.ts):**
- Fetches accepted friend IDs from `friendships` via `supabaseAdmin`
- Queries all books owned by those friends via `supabaseAdmin`
- Matches by ISBN (strips dashes) OR exact title+author (case-insensitive, trimmed)
- Returns list of `FriendMatch`: bookId, ownerId, ownerName, ownerAvatar, status (available/lent_out)
- Available friends get a "Request to borrow" button → calls `/api/borrow-requests` inline

**Wishlist list:**
- Same row layout as My Books (cover thumbnail, title, author, category, status badge)
- Status badges: Wanted (stone), Borrowed (amber), Purchased (green)
- Teal "A friend has this\!" badge on items where `has_friend_copy = true` — clicking it re-runs the check and shows the friend modal
- ⋯ menu: Edit, Mark as purchased, Check friends again, Delete
- "Check friends again" re-runs the availability check and updates `has_friend_copy`

**Add with AI:** reuses `PhotoModal` with `redirectTo="/bookstore/add"` prop (added to PhotoModal signature)

**Files:**
- `supabase/add-wishlist.sql` — migration
- `types/index.ts` — `WishlistItem` and `FriendMatch` types
- `app/(dashboard)/bookstore/page.tsx` — server component, fetches wishlist
- `app/(dashboard)/bookstore/bookstore-client.tsx` — list UI, edit/delete/check dialogs
- `app/(dashboard)/bookstore/photo-button.tsx` — add dropdown (reuses PhotoModal with redirectTo)
- `app/(dashboard)/bookstore/actions.ts` — `addToWishlistAndCheck`, `checkFriendAvailability`, `updateWishlistItem`, `markAsPurchased`, `deleteWishlistItem`
- `app/(dashboard)/bookstore/add/page.tsx` — add page wrapper (Suspense)
- `app/(dashboard)/bookstore/add/add-wishlist-form.tsx` — add form with Fill with AI, friend availability modal
- `app/(dashboard)/books/photo-modal.tsx` — added `redirectTo?: string` prop (defaults to `/books/add`)

## Build order (phases)

- [x] Phase 1 — Foundation: Next.js setup, Supabase connection, auth (login/signup), protected routes
- [x] Phase 2 — Books: add book, list books, edit/delete
- [x] Phase 3 — Friends: search users, send/accept/decline friend requests
- [x] Phase 4 — Sharing: offer book, track loans, mark as returned
- [x] Phase 5 — PWA: add next-pwa, manifest.json, app icon, offline support (installable on iOS + Android)

## Environment variables

All must be set in Vercel project → Settings → Environment Variables (Production scope).

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://njyugygdhkegagnapbcy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_OjZw6dEXgxUM3sD8qfQAvA_uU_Ek48L
SUPABASE_SERVICE_ROLE_KEY=<secret — see Supabase dashboard>

# Anthropic
ANTHROPIC_API_KEY=<secret — from console.anthropic.com>

# Stripe
STRIPE_SECRET_KEY=<sk_live_...>
STRIPE_WEBHOOK_SECRET=<whsec_...>
STRIPE_MONTHLY_PRICE_ID=<price_...>
STRIPE_ANNUAL_PRICE_ID=<price_...>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<pk_live_...>
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=<price_...>
NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID=<price_...>

# Resend (transactional email)
RESEND_API_KEY=<secret — from resend.com dashboard>

# Vercel cron security
CRON_SECRET=<random 32+ char string — set same value in Vercel env vars>
```

Note: `STRIPE_SECRET_KEY` must NOT be initialized at module load time — use `getStripe()` from `lib/stripe.ts` (lazy singleton) to avoid Next.js build crashes when the var is absent.

## Design system

- **Component library** — shadcn/ui (base-ui variant, not Radix — no `asChild` prop)
- **Base color** — `stone` (warm grey, close to aged paper)
- **Dark mode** — off
- **Design principle** — warm, readable, minimal. Think a physical library, not a tech product.
- To add a shadcn component: `npx shadcn@latest add <name>`
- `buttonVariants` must be used with `<Link>` instead of `<Button asChild>` — this version of shadcn uses `@base-ui/react` which does not support `asChild`

## Next.js 16 specifics

- **`proxy.ts` instead of `middleware.ts`** — Next.js 16 renamed the middleware convention. The exported function must be named `proxy` (not `middleware`). The `config.matcher` export still works the same way.
- **Turbopack is the default** — `npm run dev` uses Turbopack. `npm run build` uses `--webpack` because `@ducanh2912/next-pwa` is a webpack plugin and is incompatible with Turbopack.
- **`turbopack: {}`** in `next.config.ts` silences the webpack/Turbopack conflict warning during dev (PWA is disabled in dev anyway).
- **`asChild` not supported** — shadcn/ui in this project uses `@base-ui/react/button` instead of Radix. Use `buttonVariants({ className })` on a `<Link>` instead.

## PWA setup

- Package: `@ducanh2912/next-pwa` (maintained fork of next-pwa, supports Next.js 13+)
- Service worker is generated at build time into `public/sw.js` — this file is gitignored
- PWA is disabled in development (`disable: process.env.NODE_ENV === 'development'`)
- Icons live in `public/icons/` — generated from `icon.svg` via sharp at 192px, 512px, and 180px (Apple touch icon)
- Manifest: `public/manifest.json` — theme color `#292524` (stone-800), start URL `/books`
- `viewport-fit=cover` is set in `app/layout.tsx` (`viewportFit: "cover"` in the `Viewport` export) — required for `env(safe-area-inset-bottom)` to work on both iPhone and Android PWAs

## Mobile navigation

Mobile (below 640px breakpoint) uses a **bottom navigation bar** instead of the top nav links. This matches the native app convention for PWAs installed from Safari (iPhone) and Chrome (Android).

**Top bar on mobile:**
- Keeps: BookShelf wordmark (left), bell icon with badge, avatar dropdown (right)
- Hides: all navigation links (Books, Friends, Messages, Loans)
- Height: 52px; background: stone-50
- Bell and avatar behavior identical to desktop

**Bottom nav bar ():**
- Fixed to bottom of screen, `sm:hidden` (invisible on desktop)
- 4 tabs: Books (BookOpen), Friends (Users), Messages (MessageSquare), Loans (ArrowLeftRight) — from lucide-react
- Active tab: stone-900 (#1c1917) + strokeWidth 2; inactive: stone-400 (#a8a29e) + strokeWidth 1.5
- Red dot badge (8px, no count) on Messages when `unreadMessages > 0`, on Loans when `pendingRequests > 0`
- Polls `/api/nav-counts` every 30 seconds (same endpoint as top nav)
- Added in `app/(dashboard)/layout.tsx` so it appears on every dashboard page

**Safe area handling (PWA on iPhone and Android):**
- `padding-bottom: max(14px, env(safe-area-inset-bottom))` applied to the bottom nav
- iPhone home indicator: `env(safe-area-inset-bottom)` ≈ 34px → nav extends below tabs
- Android gesture navigation: `env(safe-area-inset-bottom)` ≈ 24px → same handling
- Requires `viewport-fit=cover` (set above) for the env() variable to work

**Content area bottom padding:**
- `pb-24 sm:pb-8` on the dashboard `<main>` element gives 96px bottom clearance on mobile, 32px on desktop
- Prevents page content from being obscured by the bottom nav

## Key decisions and why

- **App Router over Pages Router** — App Router is the current Next.js standard; better for server components and server actions
- **Server Actions for mutations** — simpler than API routes for this app's needs; reduces boilerplate
- **`profiles` table separate from `auth.users`** — Supabase's `auth.users` is not directly accessible from the client for security reasons; `profiles` is the public-facing user table
- **`status` field on books** — simple text enum instead of a join; fast to query, easy to understand
- **`proxy.ts` for session refresh** — Supabase requires the session to be refreshed on every request; the proxy intercepts all non-static requests to do this
- **User search via API route** — `/api/users/search` rather than a server action, because search is a GET with a query param called from a client component

### Invite friends by email
Users can invite friends who aren't yet on BookShelf via email.

**Database table: `invitations`** (run `supabase/add-invitations.sql`):
```sql
id               uuid        PRIMARY KEY DEFAULT gen_random_uuid()
inviter_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
email            text        NOT NULL
status           text        NOT NULL DEFAULT 'pending'  -- 'pending' | 'accepted'
token            text        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text
accepted_user_id uuid        REFERENCES profiles(id)
created_at       timestamptz DEFAULT now()
updated_at       timestamptz DEFAULT now()
UNIQUE(inviter_id, email)
```
RLS: inviter can read/insert/update their own invitations.

**Invite flow:**
1. Friends page → "Invite a friend" section: email input + "Send invite" button
2. `POST /api/invitations` checks if email already exists in `auth.users` (via `supabaseAdmin.schema('auth').from('users')`):
   - **Already registered**: returns `{ exists: true, profile }` — UI shows "Already on BookShelf, add as friend?" with Add Friend button
   - **Already invited**: returns `{ alreadyInvited: true }` — UI shows note
   - **New user**: inserts invitation row, sends email via Resend, returns `{ sent: true }`
3. Email: "[Name] invited you to join BookShelf" with CTA → `https://bookshelf.name/signup?invite={token}`
4. New user signs up at `/signup?invite={token}` → after signup, client calls `POST /api/invitations/accept` → marks invitation accepted, auto-creates pending friend request from inviter to new user → redirects to `/friends`
5. Sent invitations list on friends page: email, status badge (Invited/Accepted), date, Resend button (disabled for 24h after last send based on `updated_at`)

**API routes:**
- `POST /api/invitations` — check email, create invitation, send email
- `POST /api/invitations/accept` — accept by token, auto friend request from inviter
- `POST /api/invitations/resend` — resend email, update `updated_at`, 24h cooldown enforced

**Signup with invite token:**
- Signup action no longer calls `redirect()` — returns `{ error: null }` on success
- Signup page reads `?invite=` from `window.location.search` in the submit handler
- After successful signup: calls `/api/invitations/accept`, then `router.push('/friends')`
- Without invite: `router.push('/books')`

**Files:**
- `supabase/add-invitations.sql` — table + RLS
- `app/api/invitations/route.ts` — POST create/check
- `app/api/invitations/accept/route.ts` — POST accept by token
- `app/api/invitations/resend/route.ts` — POST resend with cooldown
- `app/(dashboard)/friends/invite-section.tsx` — client component (form + list)
- `app/(dashboard)/friends/page.tsx` — fetches invitations, renders InviteSection
- `lib/email-templates.ts` — `invitationEmail(inviterName, token)`

### Trial lifecycle emails (Vercel cron)
Three automated emails sent at key moments in the trial lifecycle. A single cron job processes all three types in one daily run.

**Vercel cron schedule** (`vercel.json`): `0 9 * * *` — runs every day at 09:00 UTC.

**Cron route:** `GET /api/cron/trial-emails`
- Secured by `Authorization: Bearer {CRON_SECRET}` header (Vercel sends this automatically)
- Returns `{ ok: true, fiveDay, oneDay, expired, errors }` with counts

**Three email types:**

| Type | Trigger | Subject | CTA |
|------|---------|---------|-----|
| 5-day reminder | `trial_ends_at` between now+4.5d and now+5.5d, `trial_reminder_5day_sent_at IS NULL` | "5 days left on your BookShelf trial" | Choose a plan → `/profile#plans` |
| 1-day reminder | `trial_ends_at` between now+20h and now+28h, `trial_reminder_1day_sent_at IS NULL` | "Your BookShelf trial ends tomorrow" | Keep my BookShelf → `/profile#plans` |
| Expired | `trial_ends_at` between now-28h and now, `trial_expired_sent_at IS NULL` | "Your BookShelf trial has ended" | Reactivate my BookShelf → `/subscribe` |

**Database fields** (run `supabase/add-trial-email-fields.sql`):
- `trial_reminder_5day_sent_at` — timestamptz, nullable, set after 5-day email sent
- `trial_reminder_1day_sent_at` — timestamptz, nullable, set after 1-day email sent
- `trial_expired_sent_at` — timestamptz, nullable, set after expired email sent

**Email content:**
- Uses `first_name` from profiles (falls back to "there")
- Trial end date formatted as e.g. "Tuesday, June 10" via `en-US` locale
- Recipient email fetched via `supabaseAdmin.auth.admin.getUserById()`
- Each send is awaited (cron context, not user-facing), errors caught per-profile so one failure doesn't stop the batch
- Templates: `trialReminder5DayEmail`, `trialReminder1DayEmail`, `trialExpiredEmail` in `lib/email-templates.ts`

**Files:**
- `vercel.json` — cron schedule
- `supabase/add-trial-email-fields.sql` — migration
- `app/api/cron/trial-emails/route.ts` — cron handler
- `lib/email-templates.ts` — three new template functions

**Setup:**
1. Run `supabase/add-trial-email-fields.sql` in Supabase SQL Editor
2. Add `CRON_SECRET` to Vercel environment variables (generate with `openssl rand -hex 32`)
3. Add same `CRON_SECRET` to `.env.local` for local testing
