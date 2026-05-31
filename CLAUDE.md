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

- **Production URL:** https://bookshelf-qq7c.vercel.app
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
  /(auth)               → Login and signup pages (public)
  /(dashboard)          → Protected pages (require session)
    /books              → My books list + lend dialog
    /books/add          → Add a book form
    /friends            → Friend search, requests, friends list
    /loans              → Active loans (lent out / borrowed tabs)
  /api/users/search     → GET endpoint for user search
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
proxy.ts                → Session refresh + route protection (Next.js 16)
```

## Database schema

### `profiles`
```sql
id          uuid  PRIMARY KEY REFERENCES auth.users(id)
name        text  NOT NULL
avatar_url  text
created_at  timestamptz DEFAULT now()
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

## Auth conventions

- Supabase Auth handles sign up, login, and session management
- Protected routes live under `/app/(dashboard)` and check for a session in the layout
- The current user is accessed via `supabase.auth.getUser()` — never trust the client-side session for server operations
- After sign up, a `profiles` row is created automatically via a Supabase database trigger

## Features

### Add book by photo
Allows users to scan a book cover with their camera or upload a photo. Claude extracts book details automatically.

**Flow:**
1. User clicks "Add by photo" on `/books`
2. Modal opens with "Take photo" (rear camera) and "Upload photo" (file picker) options
3. Image is resized client-side to max 1024px (canvas + `toBlob`) before upload
4. `POST /api/extract-book` sends image to Claude vision → returns `{ title, author, isbn, description }`
5. On success: navigates to `/books/add?title=...&author=...` with pre-filled form
6. On failure: toast "Couldn't read the cover, please fill in manually" + opens empty form

**Files:**
- `app/api/extract-book/route.ts` — receives multipart image, calls Anthropic, returns JSON
- `app/(dashboard)/books/photo-modal.tsx` — dialog UI, resizes image, calls API, handles navigation
- `app/(dashboard)/books/photo-button.tsx` — small client wrapper that owns modal open/close state
- `app/(dashboard)/books/add/add-book-form.tsx` — form client component, reads `useSearchParams()` for pre-fill

**AI model:** `claude-opus-4-5` via `@anthropic-ai/sdk`

**Prompt extracts:** title, author, ISBN, publisher, year, and a ≤100-word description from Claude's knowledge of the book.

**Error handling:** JSON parse failures and API errors both fall through to an empty form with a sonner toast.

### Cover photo from scan
When a book is added via photo scan, the image is also uploaded as the book's cover:
- Server receives the image (already resized to 1024px by the client)
- `sharp` resizes it to max 400px wide on the server
- Uploaded to Supabase Storage bucket `book-covers` under `{userId}/{timestamp}.jpg`
- Public URL saved to `cover_url` field and pre-filled in the add form
- The list and detail pages display it automatically via the existing `cover_url` display logic
- Upload uses `supabaseAdmin` (service role) so no storage write policies are needed

**Storage bucket:** `book-covers` — public bucket. Run `supabase/create-book-covers-bucket.sql` in the SQL editor to create it.

### Duplicate detection
Before any book is saved (`addBook` server action), a case-insensitive check queries for an existing book with the same `title` AND `author` for the current user. If found:
- Server action returns `{ duplicate: true }` instead of inserting
- The add form detects this and shows a dialog: "You already have this book on your shelf"
- "Add anyway" calls `addBookForce()` which skips the check and inserts directly
- "Cancel" dismisses the dialog and returns to the form

### Book detail page
Route: `/books/[id]` — dedicated page for a single book.

Shows:
- Large cover image (if available) alongside title, author, status badge
- If lent out: borrower name and date lent
- Publisher, year, ISBN in a metadata grid
- Full description
- Edit (opens dialog) and Delete buttons

**Files:** `app/(dashboard)/books/[id]/page.tsx` (server), `app/(dashboard)/books/[id]/book-detail-actions.tsx` (client — edit dialog + delete)

### Description field
Books now have an optional `description` field (text). Added to:
- `books` table via `supabase/add-description.sql`
- Add book form (pre-filled by photo scan or typed manually)
- Edit book dialog

## Build order (phases)

- [x] Phase 1 — Foundation: Next.js setup, Supabase connection, auth (login/signup), protected routes
- [x] Phase 2 — Books: add book, list books, edit/delete
- [x] Phase 3 — Friends: search users, send/accept/decline friend requests
- [x] Phase 4 — Sharing: offer book, track loans, mark as returned
- [x] Phase 5 — PWA: add next-pwa, manifest.json, app icon, offline support (installable on iOS + Android)

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=https://njyugygdhkegagnapbcy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_OjZw6dEXgxUM3sD8qfQAvA_uU_Ek48L
SUPABASE_SERVICE_ROLE_KEY=<secret — see Supabase dashboard>
```

Must be set in Vercel project → Settings → Environment Variables for Production scope.

```
ANTHROPIC_API_KEY=<secret — from console.anthropic.com>
```

Also add `ANTHROPIC_API_KEY` to Vercel project → Settings → Environment Variables.

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

## Key decisions and why

- **App Router over Pages Router** — App Router is the current Next.js standard; better for server components and server actions
- **Server Actions for mutations** — simpler than API routes for this app's needs; reduces boilerplate
- **`profiles` table separate from `auth.users`** — Supabase's `auth.users` is not directly accessible from the client for security reasons; `profiles` is the public-facing user table
- **`status` field on books** — simple text enum instead of a join; fast to query, easy to understand
- **`proxy.ts` for session refresh** — Supabase requires the session to be refreshed on every request; the proxy intercepts all non-static requests to do this
- **User search via API route** — `/api/users/search` rather than a server action, because search is a GET with a query param called from a client component
