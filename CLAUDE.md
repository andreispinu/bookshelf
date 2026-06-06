# BookShelf — CLAUDE.md

## What this app does

BookShelf is a personal book library app. Users can:
- Create an account and manage their profile
- Add books they own at home
- Add friends (other users)
- Share and lend books between friends

## Language auto-detection

The app automatically detects the user's preferred language on first visit and persists it.

**Detection priority (highest to lowest):**
1. User's `ui_language` in their profile — always takes precedence; synced to cookie at login
2. `NEXT_LOCALE` cookie — set by manual language switch or auto-detection; persists 1 year
3. `x-vercel-ip-country` header — Vercel geo-detection, mapped via `COUNTRY_TO_LOCALE`
4. `Accept-Language` request header — primary language tag extracted and matched
5. Default: `'en'`

**Country → locale mapping** (`lib/locale-detection.ts`):
- `ro`: RO (Romania), MD (Moldova)
- `ru`: RU, BY, KZ, UA, KG, TJ, TM, UZ, AM, AZ, GE
- All other countries → `en`

**Auto-detection flow** (`proxy.ts`):
- Runs on every request before auth checks
- Only sets the cookie when `NEXT_LOCALE` is **absent** — never overwrites a user's manual choice
- Detects from `x-vercel-ip-country`, falls back to `Accept-Language`, defaults to `en`

**Login sync** (`app/(auth)/actions.ts`):
- If profile has `ui_language`: sets `NEXT_LOCALE` cookie to match (profile wins)
- If profile has no `ui_language`: saves current `NEXT_LOCALE` cookie to profile

**Signup** (`app/(auth)/actions.ts`):
- Reads `NEXT_LOCALE` cookie and saves it as `ui_language` on the new profile row

**Dashboard runtime sync** (`app/(dashboard)/locale-sync.tsx` + `locale-actions.ts`):
- `LocaleSync` client component renders in the dashboard layout
- If `ui_language` set but doesn't match cookie → calls `syncLocaleFromProfile()` + `router.refresh()`
- If `ui_language` null → calls `syncLocaleToProfile()` (saves cookie to profile once)
- Client-side cookie read avoids unnecessary server round-trips when already in sync

**Manual language switch** (`landing-nav.tsx`, `profile/language-section.tsx`):
- Calls `setLocale()` / `updateUiLanguage()` which update both cookie and profile
- Shows a subtle note "Language set to X — overrides auto-detection" after switching

**Files:**
- `lib/locale-detection.ts` — `COUNTRY_TO_LOCALE` map + `detectLocaleFromHeaders()`
- `proxy.ts` — auto-detect on first visit
- `app/(auth)/actions.ts` — login sync + signup lang save
- `app/(dashboard)/locale-actions.ts` — `syncLocaleFromProfile()`, `syncLocaleToProfile()`
- `app/(dashboard)/locale-sync.tsx` — client component, runs on dashboard mount
- `app/(dashboard)/layout.tsx` — fetches `ui_language`, renders `LocaleSync`

## Admin dashboard

Route: `/admin` — server-side only, no client-side access.

**Access control** (`proxy.ts`):
- Path starts with `/admin` → check `user.email`
- Not logged in → redirect to `/login`
- Email ≠ `sp_andrei@yahoo.com` → redirect to `/books`
- No other users can access this route under any circumstances

**Layout** (`app/admin/layout.tsx`): Clean white utility layout — "BookShelf Admin" wordmark + "← Back to app" link. No main app nav.

**Page** (`app/admin/page.tsx`): `export const revalidate = 300`. All data fetched server-side via `supabaseAdmin`. "Refresh data" button calls `router.refresh()`.

**Tab navigation** (`app/admin/admin-tabs.tsx`): Sticky tabs — Overview | Users | Revenue | Activity — with IntersectionObserver active-section highlighting.

**Sections:**

| Section | Key metrics |
|---------|-------------|
| Overview | Total users, paid, MRR, ARR, trial→paid rate, new today/week/month |
| Users | Subscription breakdown, growth, conversion & churn, recent registrations table (10), signups feed (20) |
| Revenue | MRR, ARR, monthly/annual subscriber counts, new subs this month, est. total revenue |
| Activity | Books, Friends & Social, Lending, Messaging, Reading & Wishlist |

**Revenue calculations** (from Supabase profiles table — NOT Stripe API):
- MRR = (monthly_active × $1) + (annual_active × $10 ÷ 12)
- ARR = MRR × 12
- Est. total revenue = (monthly_ever_paid × $1) + (annual_ever_paid × $10), where "ever paid" uses `subscribed_at IS NOT NULL`
- `subscribed_at` column: set by Stripe webhook (`checkout.session.completed`) on first activation only (`.is('subscribed_at', null)` guard). Existing actives backfilled via `supabase/add-subscribed-at.sql`.

**Files:**
- `proxy.ts` — admin route guard (email whitelist)
- `supabase/add-subscribed-at.sql` — migration + backfill
- `app/api/stripe/webhook/route.ts` — sets `subscribed_at` on first checkout
- `app/admin/layout.tsx` — minimal admin layout
- `app/admin/admin-tabs.tsx` — sticky tab nav (client component)
- `app/admin/admin-refresh.tsx` — refresh button (client component)
- `app/admin/page.tsx` — full dashboard (server component, revalidate=300)

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
    /books/read-with-ai → Read with AI — daily AI-generated insights
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
  /api/read-with-ai/generate → POST { readingId, bookId } → Claude generates 10-20 insights
  /api/cron/deliver-insights → GET (cron, 08:00 UTC) — delivers one insight/day per active reading
  /api/cron/message-digest   → GET (cron, 18:00 UTC) — sends daily unread message digest emails
  /api/cron/trial-emails     → GET (cron, 09:00 UTC) — 5-day, 1-day, expired trial reminder emails
  /api/cron/overdue-loans    → GET (cron, 09:00 UTC) — marks active loans past due_date as overdue, sends email
  /api/loans/workflow        → PATCH — loan lifecycle transitions (confirm_handoff, confirm_receipt, initiate_return, confirm_return, deny_return)
  /api/loan-extensions       → POST create extension request | PATCH approve/decline
  /api/loan-recalls          → POST create recall | PATCH acknowledge
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
reading_ai_email_notifications  boolean DEFAULT true  -- daily insight email opt-out
message_digest_enabled          boolean DEFAULT true  -- daily message digest email opt-out
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
id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid()
book_id               uuid        NOT NULL REFERENCES books(id) ON DELETE CASCADE
lender_id             uuid        NOT NULL REFERENCES profiles(id)
borrower_id           uuid        NOT NULL REFERENCES profiles(id)
loaned_at             timestamptz DEFAULT now()
returned_at           timestamptz   -- set when workflow_status = 'completed'
due_date              timestamptz   -- set when borrower confirms receipt
handoff_confirmed_at  timestamptz
received_confirmed_at timestamptz
return_initiated_at   timestamptz
return_confirmed_at   timestamptz
workflow_status       text        NOT NULL DEFAULT 'pending_handoff'
approved_days         int           -- set at approval time
overdue_email_sent_at timestamptz
```

Run `supabase/add-lending-workflow.sql` in the Supabase SQL Editor to add these columns.

### `loan_extensions`
```sql
id             uuid        PRIMARY KEY DEFAULT gen_random_uuid()
loan_id        uuid        NOT NULL REFERENCES loans(id) ON DELETE CASCADE
requested_by   uuid        NOT NULL REFERENCES profiles(id)
requested_days int         NOT NULL
status         text        NOT NULL DEFAULT 'pending'  -- 'pending' | 'approved' | 'declined'
requester_note text
owner_note     text
created_at     timestamptz DEFAULT now()
responded_at   timestamptz
```

### `loan_recalls`
```sql
id           uuid        PRIMARY KEY DEFAULT gen_random_uuid()
loan_id      uuid        NOT NULL REFERENCES loans(id) ON DELETE CASCADE
requested_by uuid        NOT NULL REFERENCES profiles(id)
reason       text
status       text        NOT NULL DEFAULT 'pending'  -- 'pending' | 'acknowledged'
created_at   timestamptz DEFAULT now()
```

### `reading_ai_books`
```sql
id            uuid        PRIMARY KEY DEFAULT gen_random_uuid()
user_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
book_id       uuid        NOT NULL REFERENCES books(id) ON DELETE CASCADE
status        text        NOT NULL DEFAULT 'pending'  -- 'pending' | 'generating' | 'active' | 'completed'
added_at      timestamptz DEFAULT now()
started_at    timestamptz
completed_at  timestamptz
UNIQUE(user_id, book_id)
```

### `reading_ai_insights`
```sql
id           uuid        PRIMARY KEY DEFAULT gen_random_uuid()
reading_id   uuid        NOT NULL REFERENCES reading_ai_books(id) ON DELETE CASCADE
user_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
book_id      uuid        NOT NULL REFERENCES books(id) ON DELETE CASCADE
position     int         NOT NULL
title        text        NOT NULL
insight      text        NOT NULL
extract      text        NOT NULL
delivered_at timestamptz           -- null = not yet delivered by cron
read_at      timestamptz           -- null = unread by user
created_at   timestamptz DEFAULT now()
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

### Share my shelf
A "Share my shelf" button (ghost style, `Share2` icon) sits next to "Add a book" in the top-right of `/books`. Icon-only on mobile, icon + text on desktop.

**Flow:**
1. Click → check if `profile.username` is set
2. **No username** → "Set up your public profile first" modal: username input with 500ms debounced availability check (same regex/API as profile page), "Save & continue" calls `updateUsername()`, then advances to the share modal
3. **Username exists** → Share modal directly

**Share modal:**
- Preview card: `[Name]'s BookShelf` / `bookshelf.name/[username]` / book count
- If `profile_visibility === 'private'`: amber warning + "Make public & share" button (calls `updateProfileVisibility('public_full')`, updates local state immediately)
- Copy link button: copies `https://bookshelf.name/[username]`, shows "Copied!" for 2s
- Facebook button (`#1877F2`): opens `https://www.facebook.com/sharer/sharer.php?u=<encoded-url>` in new tab
- LinkedIn button (`#0A66C2`): opens `https://www.linkedin.com/sharing/share-offsite/?url=<encoded-url>` in new tab
- Share buttons only shown when visibility is public (private → show make-public CTA instead)

**Files:**
- `app/(dashboard)/books/share-shelf-button.tsx` — self-contained client component with both modals
- `app/(dashboard)/books/page.tsx` — fetches `profiles.username, profile_visibility, name`; renders `<ShareShelfButton>` next to `<AddBookButton>`

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

**Cache strategy (ISR):** `export const revalidate = 300` at the top of `app/page.tsx` — Next.js regenerates the page in the background every 5 minutes as a safety net. Additionally, `addBook()` and `addBookForce()` server actions call `revalidatePath('/')` after a successful insert, so the landing page is invalidated immediately whenever any user adds a book. The two approaches complement each other: on-demand revalidation for instant freshness, time-based revalidation as a fallback.

**Sections (in order):**
1. **Nav** — "BookShelf" logo left; center links: Books (#recent-books), Features, How it works, Install, Pricing; "Log in" + "Start free trial" right. If user is already logged in, shows "Go to my shelf" instead.
2. **Hero** — headline, subheadline, two CTAs ("Start free trial" dark primary, "See how it works" ghost scrolls to `#how-it-works`), note "Free for 14 days. No credit card required."
3. **Recently Added Books** — only shown if ≥ 3 books with a cover exist. Fetches up to 1000 most recent books from **all** users regardless of `profile_visibility` via `supabaseAdmin` (bypasses RLS). Shows only cover image, title, category pill, and availability badge — **no author, no owner name, no link to owner** (privacy preserved). Client component (`app/recently-added-client.tsx`) handles category filtering: pills for categories with ≥ 5 books, sorted by count descending, horizontally scrollable on mobile. "All (N)" pill shows total count. Selecting a category shows up to 10 most recent books in it; if a category has < 10 books (but ≥ 5), all are shown. No pills shown if no category has ≥ 5 books.
4. **Features** — 3-column grid (stacked mobile): Add your library (AI scan), Lend to friends (track loans), Always with you (PWA).
4. **How it works** (`id="how-it-works"`) — Three-column layout on desktop (`lg:grid-cols-3`), stacked on mobile. Each column in a stone-100 card. Sub-section 1 "Build your library" (BookOpen icon): 4 steps — Create account, Add books, Organise by category, Share your shelf. Sub-section 2 "Lend & borrow with friends" (ArrowLeftRight icon): 5 steps — Add friends, Browse their shelves, Request to borrow, Coordinate the handoff, Return smoothly. Sub-section 3 "Buy & sell with friends" (Tag icon): 4 steps — Mark books for sale, Friends see your listing, Send a buy request, Transfer the book. Driven by `LIBRARY_STEP_KEYS`, `LEND_STEP_KEYS`, and `BUY_SELL_STEP_KEYS` arrays in `page.tsx`; each key maps to `s_${key}_title` and `s_${key}_desc` translation keys in the `landing` namespace.
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

**Category translation:** Category values are **always stored in English** in the database (e.g. `"Fiction"`). Only the display label is translated. Use the `translateCategory(category, t)` helper from `lib/translate-category.ts`, passing a `t` function from `useTranslations('categories')` (client) or `await getTranslations('categories')` (server). Translation keys live in `messages/*/categories` namespace with the English name as the key. This ensures AI auto-assignment and filtering logic work regardless of UI language.

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

**New message flow:**
- "New message" button (SquarePen icon) sits in the conversation list header — icon only on mobile, icon + text on desktop
- Clicking it opens a modal overlay with a searchable list of all accepted friends
- Friends are fetched server-side in `page.tsx` via `getFriends()`, filtered to `status === 'accepted'`, and passed as a `friends` prop to `MessagesClient`
- Selecting a friend closes the modal and navigates to `?with=<friendId>` — opens an existing conversation if one exists, or starts a new empty chat
- Chat panel header always shows recipient avatar, name, and country flag (if set) — even for brand-new conversations with no messages. Header info is resolved from the `friends` prop first (`FriendForCompose` includes country); falls back to `activeConv` data for conversations with ex-friends who are no longer in the friends list
- Empty conversations state also shows a "Start a conversation" button that opens the same modal
- Modal closes on backdrop click or X button; search is cleared on close

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

**API route:** `app/api/borrow-requests/route.ts` — GET pending incoming, POST create, PATCH approve/reject. Uses `supabaseAdmin` for all DB operations. POST always inserts a `borrow_request` JSON card into `messages`; PATCH always inserts a `borrow_response` JSON card. PATCH with `action = 'approve'` also sends a fire-and-forget approval email to the requester (see Email notifications).

**Files:**
- `app/(dashboard)/friends/[id]/borrow-button.tsx` — modal with book props (bookId, bookTitle, ownerId)
- `app/(dashboard)/loans/requests/page.tsx` + `requests-client.tsx` — incoming requests UI
- `app/(dashboard)/loans/loan-list.tsx` — updated with Requests tab + `sentRequests` prop
- `app/(dashboard)/loans/page.tsx` — fetches sent requests, passes `defaultTab` from searchParams

### Lending workflow

The loan lifecycle follows a strict 8-status workflow managed via the `workflow_status` field on `loans`.

**Statuses:**
`pending_handoff` → `pending_receipt` → `active` → (`overdue` / `extension_requested` / `recall_requested`) → `pending_return` → `completed`

**Transitions:**
| Action | Actor | From → To |
|--------|-------|-----------|
| Approve borrow request | Lender | — → `pending_handoff` (loan created) |
| confirm_handoff | Lender | `pending_handoff` → `pending_receipt` |
| confirm_receipt | Borrower | `pending_receipt` → `active` (sets `due_date`) |
| Cron runs | System | `active` (past due) → `overdue` |
| Request extension | Borrower | `active`/`overdue` → `extension_requested` |
| Approve extension | Lender | `extension_requested` → `active` (new due_date) |
| Decline extension | Lender | `extension_requested` → `active`/`overdue` |
| Request recall | Lender | `active`/`overdue` → `recall_requested` |
| Acknowledge recall | Borrower | stays `recall_requested` (status updated on recall row) |
| initiate_return | Borrower | `active`/`overdue`/`recall_requested` → `pending_return` |
| confirm_return | Lender | `pending_return` → `completed` |
| deny_return | Lender | `pending_return` → `active`/`overdue` |

**Duration selector:** Borrow request modal shows 7/14/30/60/custom days selector. Stored as `requested_days` on `borrow_requests`. Lender can override when approving (`approved_days`). Due date is set = `received_confirmed_at + approved_days`.

**Loans page UI:**
- Lent out / Borrowed tabs show status badge per loan with contextual action buttons
- Loans sorted: action-needed statuses first (extension_requested, recall_requested, pending_return, etc.)
- Extension modal: borrower picks days (7/14/30/60/custom) + optional note → POST /api/loan-extensions
- Recall modal: lender optionally adds reason → POST /api/loan-recalls
- All mutations call `router.refresh()` after success to re-fetch server data

**API routes:**
- `PATCH /api/loans/workflow` — `{ loanId, action }` — handles all workflow transitions
- `POST /api/loan-extensions` — borrower creates extension request
- `PATCH /api/loan-extensions` — lender approves or declines extension
- `POST /api/loan-recalls` — lender creates recall
- `PATCH /api/loan-recalls` — borrower acknowledges recall
- `GET /api/cron/overdue-loans` — daily cron at 09:00 UTC, sets active loans past due_date to overdue, sends email once

**Cron:** `0 9 * * *` — `overdue_email_sent_at` guards against duplicate emails

**Email notifications (10 templates):**
- `lenderHandoffReminderEmail` — after lender approves borrow request
- `borrowerReceiptConfirmEmail` — after lender confirms handoff
- `loanStartedEmail` — after borrower confirms receipt
- `loanOverdueEmail` — sent by overdue cron (once per loan)
- `extensionRequestEmail` — to lender when borrower requests extension
- `extensionApprovedEmail` — to borrower when lender approves
- `extensionDeclinedEmail` — to borrower when lender declines
- `recallRequestEmail` — to borrower when lender recalls
- `returnInitiatedEmail` — to lender when borrower initiates return
- `returnConfirmedEmail` — to borrower when lender confirms return

**DB migration:** Run `supabase/add-lending-workflow.sql` in the Supabase SQL Editor.

**Files:**
- `supabase/add-lending-workflow.sql` — migration (ALTER TABLE loans, borrow_requests; CREATE TABLE loan_extensions, loan_recalls)
- `app/api/loans/workflow/route.ts` — workflow transitions
- `app/api/loan-extensions/route.ts` — extension CRUD
- `app/api/loan-recalls/route.ts` — recall CRUD
- `app/api/cron/overdue-loans/route.ts` — daily overdue check
- `app/(dashboard)/loans/loan-list.tsx` — fully workflow-aware loan list with modals (all buttons use optimistic UI updates with success toasts)
- `app/(dashboard)/loans/page.tsx` — fetches extensions + recalls, merges with loans
- `app/(dashboard)/friends/[id]/borrow-button.tsx` — duration selector added
- `app/(dashboard)/messages/borrow-card.tsx` — `requested_days` display + `approved_days` input
- `lib/email-templates.ts` — 10 new templates

### System messages in chat

Every workflow action automatically posts a system event message to the messages thread between the lender and borrower.

**Format:** Content is stored in the `messages` table with a `SYSTEM:` prefix (e.g. `SYSTEM:🤝 Alice confirmed handing over "Dune". Please confirm you received it.`).

**Detection:** `content.startsWith('SYSTEM:')` — no separate DB column needed.

**Chat UI rendering** (`messages-client.tsx`): System messages are rendered as a centered pill — `text-xs text-stone-400 bg-stone-100 px-3 py-1 rounded-full` — with no sender avatar. Regular and borrow-card messages are unaffected.

**Conversation list preview** (`formatPreview`): SYSTEM: prefix is stripped and the text is shown as-is in italic muted style.

**No notification triggered:** The DB trigger `notify_new_message()` skips messages starting with `SYSTEM:`. Run `supabase/update-message-notification-trigger.sql` to apply this rule.

**Helper:** `lib/send-system-message.ts` → `sendSystemMessage(senderId, receiverId, text)` — inserts via `supabaseAdmin`, safe to call from any server context.

**12 workflow events that trigger system messages:**

| # | Event | File | Sender → Receiver | Message |
|---|-------|------|-------------------|---------|
| 1 | Borrow request sent | borrow-requests POST | — | (existing borrow_request card, no change) |
| 2 | Request approved | borrow-requests PATCH | lender → borrower | 📚 [Lender] approved your request to borrow "[Book]" for N days |
| 3 | Request declined | borrow-requests PATCH | lender → borrower | ❌ [Lender] declined your request to borrow "[Book]" |
| 4 | Handoff confirmed | loans/workflow confirm_handoff | lender → borrower | 🤝 [Lender] confirmed handing over "[Book]". Please confirm you received it. |
| 5 | Receipt confirmed | loans/workflow confirm_receipt | borrower → lender | ✅ [Borrower] confirmed receiving "[Book]". Loan is active — due back by [date]. |
| 6 | Loan overdue | cron/overdue-loans | lender → borrower | ⏰ "[Book]" was due on [date] and is now overdue. Please return it or request an extension. |
| 7 | Extension requested | loan-extensions POST | borrower → lender | 🔄 [Borrower] is requesting N more days for "[Book]"[. Note: "..."] |
| 8 | Extension approved | loan-extensions PATCH | lender → borrower | ✅ [Lender] approved the extension. New due date: [date]. |
| 9 | Extension declined | loan-extensions PATCH | lender → borrower | ❌ [Lender] declined the extension request. Please return "[Book]" by [date]. |
| 10 | Recall requested | loan-recalls POST | lender → borrower | 📬 [Lender] needs "[Book]" back.[If reason: Reason: "..."] |
| 11 | Return initiated | loans/workflow initiate_return | borrower → lender | 📦 [Borrower] says they've returned "[Book]". Please confirm you received it. |
| 12 | Return confirmed | loans/workflow confirm_return | lender → borrower | 🎉 [Lender] confirmed receiving "[Book]" back. Loan complete! |

### Email notifications
Transactional emails are sent via **Resend** (domain: bookshelf.name, from: noreply@bookshelf.name). All sends are fire-and-forget — never awaited in the request handler, always `.catch(console.error)` so failures never break the main flow.

**Files:**
- `lib/email.ts` — `sendEmail({ to, subject, html })` wrapper around the Resend SDK
- `lib/email-templates.ts` — template functions returning `{ subject, html }`:
  - `friendRequestEmail(senderName)`
  - `newMessageEmail(senderName, preview)`
  - `borrowRequestEmail(requesterName, bookTitle, message?)`
  - `borrowRequestApprovedEmail(firstName, ownerName, bookTitle)` — sent to requester when owner approves
  - `messageDigestEmail(firstName, conversations[])` — daily digest (see Daily message digest below)
  - `dailyInsightEmail(firstName, bookTitle, bookAuthor, insightTitle, insightText, extract, position, total)` — sent by deliver-insights cron
  - `invitationEmail(inviterName, token)`
  - `trialReminder5DayEmail(firstName, trialEndsAt)`
  - `trialReminder1DayEmail(firstName, trialEndsAt)`
  - `trialExpiredEmail(firstName)`
  - `lenderHandoffReminderEmail(firstName, borrowerName, bookTitle, approvedDays)` — to lender after approving request
  - `borrowerReceiptConfirmEmail(firstName, lenderName, bookTitle)` — to borrower after lender confirms handoff
  - `loanStartedEmail(firstName, lenderName, bookTitle, dueDate)` — to borrower after confirming receipt
  - `loanOverdueEmail(firstName, bookTitle, lenderName, dueDateStr)` — to borrower from overdue cron
  - `extensionRequestEmail(firstName, borrowerName, bookTitle, days, note?)` — to lender
  - `extensionApprovedEmail(firstName, lenderName, bookTitle, newDueDateStr)` — to borrower
  - `extensionDeclinedEmail(firstName, lenderName, bookTitle)` — to borrower
  - `recallRequestEmail(firstName, lenderName, bookTitle, reason?)` — to borrower
  - `returnInitiatedEmail(firstName, borrowerName, bookTitle)` — to lender
  - `returnConfirmedEmail(firstName, lenderName, bookTitle)` — to borrower
- Templates use inline HTML/CSS with the BookShelf stone brand (Georgia serif, stone-800 background CTA button, warm grey palette)
- Recipient email fetched via `supabaseAdmin.auth.admin.getUserById(userId)` (only auth.users has email)

**Transactional triggers (fire-and-forget):**

| Event | File | Recipient | Debounce |
|-------|------|-----------|----------|
| Friend request sent | `app/(dashboard)/friends/actions.ts` → `sendFriendRequest()` | Addressee | None |
| Message sent | `app/api/messages/route.ts` → POST | Receiver | Skip if unread `new_message` notification from same sender already exists |
| Borrow request created | `app/api/borrow-requests/route.ts` → POST | Book owner | None |
| Borrow request approved | `app/api/borrow-requests/route.ts` → PATCH (approve) | Requester | None |

**Message email debounce:** Before sending, checks if a `new_message` notification already exists (`read = false`, same `actor_id`) — if so, user is likely actively chatting and email is skipped. Also skips JSON borrow card messages (content starts with `{`).

### Daily message digest
A daily cron collects unread messages and sends one digest email per user instead of spamming per-message notifications.

**Cron schedule** (`vercel.json`): `0 18 * * *` — runs every day at 18:00 UTC.

**Cron route:** `GET /api/cron/message-digest`
- Secured by `Authorization: Bearer {CRON_SECRET}` header
- Finds all `receiver_id`s with unread, non-borrow-card messages (`content NOT LIKE '{%'`) in the past 24 hours
- Filters to users with `message_digest_enabled = true`
- For each recipient: groups messages by sender, fetches sender names, sends one digest email
- Non-overlapping windows: cron runs at the same time daily so each message is covered by exactly one 24h window — no dedup logic needed
- Returns `{ ok: true, sent, errors }`

**Opt-out:**
- `profiles.message_digest_enabled` — boolean DEFAULT true (run `supabase/add-message-digest-field.sql`)
- Toggle on `/profile` → Notifications section (`app/(dashboard)/profile/notifications-section.tsx`)
- Server action: `updateMessageDigestEnabled(enabled)` in `profile/actions.ts`

**Files:**
- `app/api/cron/message-digest/route.ts` — cron handler
- `app/(dashboard)/profile/notifications-section.tsx` — toggle UI
- `supabase/add-message-digest-field.sql` — migration

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

### Read with AI
Users can add up to 3 books to a daily AI reading program. Claude generates 10–20 insights per book; a daily cron delivers one insight per day per book. Users can mark insights as read and opt out of email notifications.

**Flow:**
1. From the ⋯ menu on any book → "Add to Read with AI" (calls `addToReadWithAI(bookId)`)
2. An amber "Reading" badge appears on the book row
3. Navigate to `/books/read-with-ai` — shows up to 3 book slots
4. Click "Start Reading" on a pending book → `POST /api/read-with-ai/generate` calls Claude, inserts 10–20 insights, marks first as delivered, sets status → `active`
5. Daily cron (08:00 UTC) delivers the next undelivered insight for each active reading
6. User sees the latest delivered insight on the read-with-ai page; can click "Mark as read"
7. Once all insights are delivered, reading status → `completed`
8. Email notification per insight if `reading_ai_email_notifications = true`

**Generation (`POST /api/read-with-ai/generate`):**
- Verifies ownership + status = `pending` OR `generating` (retry from stale) before calling Claude
- If retrying from `generating`: deletes any partial insights first (cleanup)
- Sets status → `generating`, calls `claude-opus-4-5` with prompt for 10–20 JSON insights
- Each insight: `{ title, insight, extract }` — title 5–8 words, insight 2–4 sentences, extract a relevant quote
- First insight gets `delivered_at = now()` immediately (no wait for cron)
- On error: reverts status → `pending`; `maxDuration = 120`

**Real-time generation status (`GET /api/read-with-ai/status?readingId={id}`):**
- Returns `{ status, insightsCount, latestInsight }` for the given reading
- Protected: verifies reading belongs to the current user
- `latestInsight` — the highest-position delivered insight (ORDER BY position DESC LIMIT 1); only included when status is `active` or `completed`
- Used by the client for polling during generation; also called after generate returns to get the first insight

**Client-side generation UX (`reading-client.tsx` → `ReadingBookCard` component):**
- Each book card is a self-contained component managing its own generation state
- **Polling**: `useEffect` starts a `setInterval` (every 3s) whenever `status === 'generating'`; stops when status changes or 10 consecutive failures → shows "Something went wrong" error
- **Stale detection**: if the page loads with a book already in `generating` state (previous session crashed), `generatingStartedAt` is set to `Date.now() - 5min` so `isStale = true` immediately → shows "Retry" button
- **Timeout**: after 30s in a fresh generation session, shows "Taking longer than expected" message
- **Animated progress bar**: indeterminate shimmer animation (`rw-shimmer` CSS keyframe) in amber while generating
- **Cycling messages**: 4 messages cycle every 2s (Analyzing → Extracting → Quotes → Preparing)
- **Completion animation**: when polling/fetch detects `active`, fills progress bar to 100% (emerald), shows "✓ N insights ready!", then reveals insight card after 1s
- **Retry flow**: clicking Retry resets `generatingStartedAt` to `Date.now()` (clears stale flag), calls generate endpoint again
- **Race guard**: `transitioned` ref prevents double-call to `transitionToActive` if both polling and the generate fetch complete at the same time

**Cron (`GET /api/cron/deliver-insights`, 08:00 UTC):**
- Fetches all `status = 'active'` readings with joined book + profile
- For each reading: finds next insight with `delivered_at IS NULL` ordered by position
- If none: marks reading `completed`
- If found: sets `delivered_at = now()`, sends `dailyInsightEmail` if `reading_ai_email_notifications = true`
- Secured by `CRON_SECRET`; `maxDuration = 60`

**Database** (run `supabase/add-reading-ai.sql`):
- `reading_ai_books` — one row per user+book, tracks status and timestamps
- `reading_ai_insights` — one row per insight, `delivered_at` and `read_at` timestamps
- `profiles.reading_ai_email_notifications` — boolean DEFAULT true

**Books page integration:**
- `⋯` menu: "Add to Read with AI" / "Remove from Read with AI" (toggles based on current state)
- Amber "Reading" badge on books that are in Read with AI
- Subtitle link "Read with AI (N)" when there are active readings

**Files:**
- `supabase/add-reading-ai.sql` — migration
- `app/(dashboard)/books/read-with-ai/actions.ts` — `addToReadWithAI`, `removeFromReadWithAI`, `markInsightRead`, `updateReadingAiNotifications`
- `app/(dashboard)/books/read-with-ai/page.tsx` — server page, fetches readings + delivered insights
- `app/(dashboard)/books/read-with-ai/reading-client.tsx` — client UI: book cards, start/generating/active/completed states, notification toggle
- `app/api/read-with-ai/generate/route.ts` — Claude generation endpoint (also handles retry from `generating` state)
- `app/api/read-with-ai/status/route.ts` — GET polling endpoint; returns `{ status, insightsCount, latestInsight }`
- `app/api/cron/deliver-insights/route.ts` — daily delivery cron
- `lib/email-templates.ts` → `dailyInsightEmail()`

### Buy & Sell
Users can mark books for sale and buy books from friends. Built on top of the existing borrow/messaging infrastructure.

**Database migration:** Run `supabase/add-buy-sell.sql`.

**New columns on `books` table:**
```sql
sale_price       decimal(10,2)
sale_currency    text DEFAULT 'EUR'
condition_note   text
availability_mode text DEFAULT 'lend_only'  -- 'lend_only' | 'sell_only' | 'lend_and_sell'
```

**New `sale_requests` table:**
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
book_id       uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE
buyer_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
seller_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
message       text
sale_price    decimal(10,2)
sale_currency text DEFAULT 'EUR'
status        text NOT NULL DEFAULT 'pending'  -- 'pending' | 'accepted' | 'declined' | 'completed'
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()
```
RLS: participants can read, buyer can insert, participants can update.

**Currency formatting** (`lib/format-currency.ts`):
- Supported: `EUR` (€), `USD` ($), `GBP` (£), `RON` (lei), `MDL` (L)
- EUR/USD/GBP: symbol prefix (e.g. `€10`, `$5`, `£8`)
- RON/MDL: symbol suffix (e.g. `150 lei`, `200 L`)
- `CURRENCIES` exported const array; `Currency` exported type; `formatPrice(amount, currency)` exported function

**Seller flow:**
1. ⋯ menu on any book → "Book availability" → `AvailabilityModal`
2. 3 radio-style cards: Lend only / Sell only / Lend & sell
3. Sell modes show price input, currency selector, condition note textarea
4. Saves via `updateBookAvailability()` server action (ownership-checked); clears sale fields for lend_only
5. Book list shows "For sale · €10" label (grid view) / price badge (list view) when not lend_only

**Buyer flow:**
1. On friend's shelf: BorrowButton hidden when `availability_mode === 'sell_only'`; BuyButton shown when `sell_only` or `lend_and_sell`
2. BuyButton shows book price; clicking opens modal with title, price, condition note, optional message textarea
3. Submit: `POST /api/sale-requests` → creates request, inserts `SALE_REQUEST:{json}` message in thread, sends `buy_request` notification + email to seller

**Message cards in chat** (`messages-client.tsx`):
- `SALE_REQUEST:{json}` → shows book cover thumbnail, title/author, price, condition note, Accept/Decline buttons for seller (hidden if `respondedSaleRequestIds` already has a response)
- `SALE_RESPONSE:{json}` → shows accepted (green) or declined (stone) outcome card
- `formatPreview()` strips these prefixes for conversation list previews
- `respondedSaleRequestIds` useMemo mirrors the existing borrow request pattern

**Sale request lifecycle** (`app/api/sale-requests/[id]/route.ts` — PATCH):
- `accept` → updates status, inserts `SALE_RESPONSE:{json}` message, creates `buy_accepted` notification + email to buyer
- `decline` → same but `buy_declined`
- `complete` ("Confirm sold") → transfers book: inserts copy for buyer (`availability_mode: 'lend_only'`), deletes original from seller; creates `book_transferred` notification + email to buyer

**Sales tab on Loans page:**
- "Sales" TabsTrigger with pending count badge
- Selling sub-section: pending/accepted requests with Accept / Decline / Confirm sold buttons
- Buying sub-section: status display for outgoing requests

**Notification types added:** `buy_request` (→ `/loans?tab=sales`), `buy_accepted` (→ `/loans?tab=sales`), `buy_declined` (→ `/loans?tab=sales`), `book_transferred` (→ `/books`)

**Email templates added** (`lib/email-templates.ts`):
- `buyRequestEmail(sellerFirstName, buyerName, bookTitle, message?)` — to seller
- `buyAcceptedEmail(buyerFirstName, sellerName, bookTitle)` — to buyer
- `buyDeclinedEmail(buyerFirstName, sellerName, bookTitle)` — to buyer
- `bookTransferredEmail(buyerFirstName, sellerName, bookTitle)` — to buyer on complete

**Admin dashboard:** "Buy & Sell" section in Activity with 3 metrics: Sale Requests Sent, Accepted (%), Completed Sales (%).

**Files:**
- `supabase/add-buy-sell.sql` — migration (ALTER books + CREATE sale_requests + RLS)
- `lib/format-currency.ts` — `CURRENCIES`, `Currency`, `formatPrice()`
- `types/index.ts` — `Book` type updated (sale_price, sale_currency, condition_note, availability_mode); new `SaleRequest` type
- `app/(dashboard)/books/actions.ts` — `updateBookAvailability()` server action
- `app/(dashboard)/books/availability-modal.tsx` — modal with 3 radio cards + price/currency/condition inputs
- `app/(dashboard)/books/book-list.tsx` — "Book availability" menu item + sale price display
- `app/(dashboard)/friends/[id]/buy-button.tsx` — buy modal + POST /api/sale-requests
- `app/(dashboard)/friends/[id]/friend-shelf-client.tsx` — BuyButton shown/hidden by availability_mode
- `app/(dashboard)/friends/shelf/shelf-client.tsx` — BuyButton in combined shelf
- `app/(dashboard)/friends/shelf/page.tsx` — selects availability_mode, sale_price, sale_currency, condition_note
- `app/(dashboard)/loans/loan-list.tsx` — Sales tab with Selling/Buying sections
- `app/(dashboard)/loans/page.tsx` — parallel sale_requests queries (as seller + as buyer)
- `app/(dashboard)/messages/messages-client.tsx` — SALE_REQUEST/SALE_RESPONSE card rendering
- `app/(dashboard)/notifications-bell.tsx` — 4 new notification types
- `app/api/sale-requests/route.ts` — GET list, POST create
- `app/api/sale-requests/[id]/route.ts` — PATCH accept/decline/complete
- `app/admin/page.tsx` — Buy & Sell metrics section

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

### PWA update & refresh strategy

**Problem:** Service workers cache aggressively. After a Vercel deploy, installed PWAs serve stale cached content until the user manually refreshes.

**Solution (three layers):**

1. **NetworkFirst cache strategy** (`next.config.ts` `workboxOptions.runtimeCaching`): All runtime requests use NetworkFirst — the SW always tries the network first and falls back to cache only when offline. This prevents stale pages on subsequent visits.

2. **Automatic update detection** (`app/pwa-updater.tsx`): A client component mounted in `app/layout.tsx` listens for SW `updatefound` events. When a new SW installs and waits (`registration.waiting`), a persistent Sonner toast appears: "A new version of BookShelf is available" with an "Update now" button. Clicking it sends `SKIP_WAITING` to the waiting SW; the `controllerchange` event then triggers `window.location.reload()`.

3. **Manual refresh button** (`app/(dashboard)/nav.tsx`): A `RefreshCw` icon button (mobile-only, `sm:hidden`) sits between the bell and avatar in the top bar. Tapping it:
   - Spins the icon for 1 second (`animate-spin`)
   - Sends `SKIP_WAITING` if a SW update is queued
   - Calls `window.location.reload()` after 1s

**Version indicator:** `process.env.NEXT_PUBLIC_BUILD_ID` is set in `next.config.ts` to the build date (`YYYY-MM-DD`). Shown at the bottom of `/profile` so users can confirm they have the latest version.

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

**Invite CTA banner** (`app/(dashboard)/friends/invite-cta.tsx`): shown at the top of `/friends`, below the page heading. Encourages users to invite 5 friends. Shows amber card with `UserPlus` icon, heading, subtext, 5-dot progress indicator (filled amber = sent, empty stone = remaining), and "Invite a friend" button that scrolls to and focuses the invite email input. Auto-disappears (returns null) once `count >= 5` — no dismiss button. Uses optimistic UI: listens for `invite-sent` custom DOM event dispatched by `InviteSection` on successful send. Also syncs with `initialCount` prop via `useEffect` so `router.refresh()` keeps it accurate. `InviteSection` has `id="invite-section"` on its root div and `id="invite-email-input"` on the email `<Input>`.

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
- After successful signup: calls `/api/invitations/accept` (wrapped in try/catch with error logging), then `router.push('/friends')`
- Without invite: `router.push('/books')`

**Invitation acceptance flow (`POST /api/invitations/accept`):**
- Requires auth (`getUser()`). If session isn't ready, returns 401 — logged as `[invitations/accept] no authenticated user`
- Finds pending invitation by token, verifies `status === 'pending'`
- Updates `status = 'accepted'`, `accepted_user_id = user.id`, `updated_at = now()`
- DB errors are checked and returned as 500 (not silently swallowed)
- Auto-creates a pending friend request from inviter → new user (if no existing friendship)
- `accepted_user_id` column already exists in the `invitations` table (in `add-invitations.sql`)

**Sent invitations display** (`invite-section.tsx`):
- Pending: shows email, date sent, amber "Invited" badge, Resend button
- Accepted: shows accepted user's avatar + name, date joined, green "Joined BookShelf" badge (no Resend button)
- The accepted user's profile is fetched via the `accepted_user:accepted_user_id(id, name, avatar_url)` FK join in the page query

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

### In-app support system
Users can contact support via a floating button present on every dashboard page. Conversations are tracked in dedicated DB tables. Admin replies from the admin panel.

**Support bot:** Fixed UUID `00000000-0000-0000-0000-000000000001` — exists in both `auth.users` and `profiles` as "BookShelf Support".

**Flow:**
1. User clicks floating `?` button (bottom-right on all dashboard pages) → navigates to `/support`
2. `/support` has two tabs: "New message" (type pills + subject + textarea) and "My messages" (ticket list + thread)
3. Submitting a new ticket: creates `support_tickets` row + inserts initial message into `support_replies` + inserts `SUPPORT:{...}` stub into `messages` table for nav preview + sends admin email
4. Admin opens `/admin/support` → sees all tickets with status badges
5. Admin clicks ticket → `/admin/support/[id]` → replies via `POST /api/admin/support/[id]`
6. Admin reply: inserts into `support_replies`, inserts `SUPPORT_REPLY:[ticketId]` stub into `messages` (for unread badge), creates `support_reply` notification, sends email to user
7. Admin can change ticket status: `open` → `in_progress` → `resolved` (sends email on resolve)
8. User's messages page shows the support bot conversation with special card rendering for SUPPORT:/SUPPORT_REPLY: messages + "Go to Support to reply →" instead of input

**Message format in `messages` table:**
- User creates ticket: `SUPPORT:{"ticketId":"...","type":"...","subject":"..."}\n[preview text]`
- Admin reply: `SUPPORT_REPLY:[ticketId]\n[reply preview text]`
- These are stubs only — actual thread lives in `support_replies` table

**Unread badge:**
- Floating support button: polls `/api/nav-counts` → `unreadSupportReplies` (from_admin replies with read_at IS NULL)
- `read_at` is set when user opens the ticket thread (`GET /api/support/[id]`)

**Database tables** (run `supabase/add-support.sql`):
- `support_tickets`: id, user_id, type, subject, status (open/in_progress/resolved), created_at, updated_at
- `support_replies`: id, ticket_id, from_admin, content, read_at, created_at

**Files:**
- `supabase/add-support.sql` — migration + bot profile creation
- `app/api/support/route.ts` — GET list, POST create ticket
- `app/api/support/[id]/route.ts` — GET thread (marks admin replies read), POST user reply
- `app/api/admin/support/route.ts` — GET all tickets (admin only)
- `app/api/admin/support/[id]/route.ts` — GET ticket, PATCH status, POST admin reply
- `app/(dashboard)/support/page.tsx` — server page, fetches tickets
- `app/(dashboard)/support/support-client.tsx` — tabbed UI (new message + ticket list + thread)
- `app/(dashboard)/support-button.tsx` — floating button with unread dot, polls nav-counts
- `app/admin/support/page.tsx` — admin ticket list
- `app/admin/support/[id]/page.tsx` — admin ticket detail (server)
- `app/admin/support/[id]/admin-support-client.tsx` — admin reply + status management (client)
- `lib/email-templates.ts` — `newTicketAdminEmail`, `adminReplyEmail`, `ticketSolvedEmail`
