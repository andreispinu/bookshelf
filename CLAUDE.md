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
| Framework | Next.js 14+ (App Router) |
| Database + Auth | Supabase (Postgres + Auth) |
| Styling | Tailwind CSS + shadcn/ui |
| Language | TypeScript |
| Hosting | Vercel |

## Project structure

```
/app                    → Next.js App Router pages and layouts
  /app/(auth)           → Auth pages (login, signup) — public routes
  /app/(dashboard)      → Protected pages (require login)
    /books              → My books list
    /books/add          → Add a book
    /friends            → Friends list
    /loans              → Books lent/borrowed
/components             → Reusable UI components
/lib                    → Utility functions and Supabase client
  /lib/supabase.ts      → Supabase client setup
  /lib/db               → Database query functions (one file per table)
/types                  → TypeScript types and interfaces
```

## Database schema

### `users` (managed by Supabase Auth)
Supabase creates this automatically. The `id` is a UUID used as a foreign key everywhere.

### `profiles`
Extends the Supabase auth user with public data.
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

## Build order (phases)

- [x] Phase 1 — Foundation: Next.js setup, Supabase connection, auth (login/signup), protected routes
- [x] Phase 2 — Books: add book, list books, edit/delete
- [ ] Phase 3 — Friends: search users, send/accept/decline friend requests
- [x] Phase 4 — Sharing: offer book, track loans, mark as returned
- [x] Phase 5 — PWA: add next-pwa, manifest.json, app icon, offline support (installable on iOS + Android)

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Design system

- **Component library** — shadcn/ui
- **Base color** — `stone` (warm grey, close to aged paper)
- **shadcn init command** — `npx shadcn@latest init` → choose: TypeScript ✓, App Router ✓, base color: Stone
- **Dark mode** — off for now; can be added later
- **Design principle** — warm, readable, minimal. Think a physical library, not a tech product.

## Key decisions and why

- **App Router over Pages Router** — App Router is the current Next.js standard; better for server components and server actions
- **Server Actions for mutations** — simpler than API routes for this app's needs; reduces boilerplate
- **`profiles` table separate from `auth.users`** — Supabase's `auth.users` is not directly accessible from the client for security reasons; `profiles` is the public-facing user table
- **`status` field on books** — simple text enum instead of a join; fast to query, easy to understand
