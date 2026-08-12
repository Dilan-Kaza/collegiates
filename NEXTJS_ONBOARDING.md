# Collegiate Wushu — Next.js Onboarding Guide

_A zero-experience-with-Next.js guide to this codebase: architecture, how routing and server actions work, prior setup, and safety concerns._

---

## 1. What this project is

A Next.js 15 (App Router) + React 19 rewrite of what used to be a **Django REST + React SPA**. The Django backend is gone — its serializers, permissions, and models were ported into TypeScript. You'll see that history everywhere in the comments ("mirrors the Django `OrderSerializer`", "Django-compatible PBKDF2"), and it explains some odd shapes.

It's a collegiate wushu competition site with two user types:

- **`user_type: "C"`** — competitors: sign up, register for events, join a group set ("team"), view the event order.
- **`user_type: "O"`** — organizers: manage registrations, group sets, blog posts, competition settings, and build the event schedule.

Stack: Next.js 15.5 · React 19 · TypeScript (strict) · Prisma 7 → Postgres · Auth.js v5 (next-auth beta) · Tailwind v4 + daisyUI 5 · Redux Toolkit (only for toasts + a loading flag) · superjson.

---

## 2. The single most important answer: **there are no server routes**

This app deliberately has **zero HTTP API routes**. There is no `app/api/` folder, no `route.ts` anywhere, and not even the usual `/api/auth/[...nextauth]` handler that next-auth normally requires. `AGENTS.md` makes this a hard rule:

> Do not create api endpoints, instead use server actions.

So there are two server-side mechanisms, and you need to understand both.

### 2a. Routing = folders (file-system routing)

In the App Router, **the folder structure under `app/` *is* the URL structure.** No route table, no config.

| Path on disk | URL |
|---|---|
| `app/(home)/page.tsx` | `/` |
| `app/dashboard/page.tsx` | `/dashboard` |
| `app/organizer/groupset/page.tsx` | `/organizer/groupset` |
| `app/organizer/groupset/[uuid]/page.tsx` | `/organizer/groupset/<anything>` |
| `app/activate/[uid]/[token]/page.tsx` | `/activate/<uid>/<token>` |

Special filenames (these are reserved — Next looks for them by name):

- **`page.tsx`** — makes a folder a real, reachable URL. A folder with no `page.tsx` is not a route.
- **`layout.tsx`** — wraps every page beneath it and **does not re-render on navigation between its children**. `app/layout.tsx` is the root: it renders `<html>`, resolves the session, and mounts the navbar.
- **`loading.tsx`** — automatic Suspense fallback. `app/loading.tsx` is why you see a spinner while a page's server data loads. You get this for free on every route.
- **`[param]`** — dynamic segment. `[uuid]` matches any single segment and hands you `params.uuid`.
- **`(group)`** — a folder in parentheses organizes files **without adding a URL segment**. `app/(home)/page.tsx` serves `/`, not `/home`.

**Gotcha that will bite you immediately:** in Next 15, `params` is a **Promise**. You must await it:

```tsx
// app/organizer/groupset/[uuid]/page.tsx
export default async function Page({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;   // ← await, or you get a Promise object
```

### 2b. Server Components vs Client Components

This is *the* concept to internalize. Everything in `app/` and `components/` is a **Server Component by default** — it runs on the server only, its code is never shipped to the browser, and it can be `async`.

A file becomes a **Client Component** by putting `"use client"` on line 1. That marks a boundary: that file *and everything it imports* gets bundled and shipped to the browser.

| | Server Component (default) | Client Component (`"use client"`) |
|---|---|---|
| Can be `async` / `await` | ✅ | ❌ |
| `useState`, `useEffect`, `onClick` | ❌ | ✅ |
| Import `@/lib/prisma`, read `process.env` secrets | ✅ | ❌ **never** |
| Code shipped to browser | ❌ | ✅ |

The convention this codebase uses everywhere — and you should copy it exactly:

> **`page.tsx` is a server component that gates auth + fetches data, then renders a sibling client component of the same name with that data as props.**

`app/dashboard/page.tsx` (server) → `<Dashboard>` in `app/dashboard/Dashboard.tsx` (client). Same for `groupset/page.tsx` → `Groupset.tsx`, `organizer/page.tsx` → `Organizer.tsx`, `register/page.tsx` → `Register.tsx`.

Anything you pass across that boundary as props must be **serializable** — plain objects, arrays, strings, numbers, `Date`, `null`. Not functions, not class instances, not Prisma model objects with methods.

### 2c. Server Actions — the actual "API layer"

All of `functions/actions/` is the replacement for the REST API. A file starting with `"use server"` exports async functions that a **client component can import and call like a normal function**:

```tsx
// app/groupset/Groupset.tsx — this is client-side code
const { error } = await createGroupset({ team_name: createName });
```

Under the hood Next replaces that import with a `fetch` POST to the current URL carrying an opaque generated action ID, runs the real function on the server, and serializes the return value back. You never write the endpoint, the URL, the fetch, or the JSON.

**This is the security fact you must never forget: a server action is a public, unauthenticated HTTP endpoint.** The action ID is discoverable in the JS bundle. Anyone can POST to it with *any* arguments they like. TypeScript types are erased at runtime and provide **zero** protection.

That's why literally every action in this codebase re-checks auth as its first statement:

```ts
// functions/actions/competitor.ts
const user = await getCurrentUser();
if (!user || !isCompetitor(user)) return { error: { detail: "Not a competitor." } };
```

```ts
// functions/actions/blog.ts
const { error } = await requireOrganizer();
if (error) return { error };
```

Two hard rules for a `"use server"` file:

1. Every export must be an `async function`. You cannot export types, constants, or sync helpers from it — that's exactly why `functions/actions/shared.ts` exists as a plain (non-`"use server"`) module holding the types and helpers.
2. Every exported function must independently authenticate and authorize. There is no middleware doing it for you.

The return-value convention is consistent and you should follow it:

- **Reads** return the data directly, and return `null` / `[]` on unauthenticated or forbidden — they don't throw.
- **Mutations** return `Mutation<T>` = `{ data: T }` or `{ error: { field: message } }` (`functions/actions/shared.ts`).

---

## 3. Prior setup — the project does not currently run

Three things are missing from your working copy right now:

**1. Dependencies aren't installed.** There is no `node_modules/`. Nothing — not `npm run dev`, not `type-check` — will work until you run:

```bash
npm install
```

`postinstall` automatically runs `prisma generate`, which creates the typed `@prisma/client` from `prisma/schema.prisma`. *(Side note: `AGENTS.md` says to read the Next.js docs in `node_modules/next/dist/docs/` before any Next work. Once you install, that directory is the authoritative reference — better than anything online, since it matches your exact version.)*

**2. There's no `.env` file.** `.env*` is gitignored, so you need to create one. Required variables:

| Variable | Why | Notes |
|---|---|---|
| `DATABASE_URL` | Prisma | Must be the **Direct TCP** Prisma Postgres URL (`postgres://…@db.prisma.io:5432/postgres?sslmode=require`). `lib/prisma.ts` explicitly **throws** if you give it a `prisma+postgres://` Accelerate URL. |
| `AUTH_SECRET` | Auth.js v5 | Signs the session JWT. Not documented anywhere in the repo but required, especially in production. Generate with `npx auth secret`. |
| `NEXT_PUBLIC_GOOGLE_API_KEY` | Google Sheets (`lib/apiClient.ts`) | Optional. ⚠️ The `NEXT_PUBLIC_` prefix means **it is embedded in the browser bundle and publicly visible.** Only ever put non-secret values behind that prefix. |

`lib/prisma.ts` throws at import time if `DATABASE_URL` is unset, so a missing `.env` fails loudly and immediately.

**3. There is no migration history.** `prisma/` contains only `schema.prisma` and `seed.ts` — no `migrations/` folder at all. But `package.json` has `"vercel-build": "prisma migrate deploy && next build"`. With an empty history that deploy step is a no-op, which means **the production schema is currently managed outside of Prisma** — it's the legacy Django database that this schema was reverse-engineered to match (note the `@@map("users")`, `@map("event_id_id")` Django-compatibility annotations).

This is the single most dangerous thing in the repo. See §6.

---

## 4. Architecture map

```
app/                      ROUTES
  layout.tsx              root: session + nav (runs on every page)
  loading.tsx             global spinner fallback
  <route>/page.tsx        SERVER: gate auth → fetch → seed cache → render
  <route>/Xxx.tsx         CLIENT: "use client", useState, calls actions

functions/
  actions/                THE API. "use server" RPC. Auth gate + Prisma + revalidate.
    shared.ts             NOT "use server" — types, cache tags, requireOrganizer
    index.ts              barrel — the public surface
  data.ts                 "server-only" cached public reads (settings, blog, colleges)
  cachedFetchers.ts       CLIENT read wrappers w/ sessionStorage cache
  cacheKeys.ts            single source of truth for client cache keys
  sessionCache.ts         sessionStorage store + useSyncExternalStore reactivity
  CacheSeed.tsx           bridges server-fetched data → client cache
  sessionContext.tsx      server-seeded useSession() (no /api/auth round-trip)

lib/
  prisma.ts               singleton PrismaClient (survives hot reload)
  auth.ts                 getCurrentUser / requireUser / requireOrganizer / isOrganizer
  api.ts                  DTO types + "shapers" (Prisma row → wire object)
  settings.ts             loadSettings() + regActive() window checks
  password.ts             Django-compatible PBKDF2

auth.ts                   Auth.js config (Credentials provider, JWT strategy)
components/               shared UI; components/index.ts is the import barrel
store/                    Redux — ONLY toasts (notif) + loading flag
routerCompat.tsx          react-router shims (Link/useNavigate/useParams)
```

**Import aliases** (from `tsconfig.json`) — use these, not relative paths:
`@/*` → project root · `@components` · `@functions` · `@slices`

**Barrels matter.** New components go in `components/index.ts`; new actions go in `functions/actions/index.ts`. Call sites import from the barrel.

---

## 5. Trace one full round trip

To make the layers concrete, here's a competitor loading `/groupset` and creating a team.

**Load:**

1. Browser hits `/groupset` → Next renders `app/groupset/page.tsx` **on the server**.
2. `await requireUser()` reads the session cookie → no session means `redirect("/signin")` before a single byte of HTML is produced. No flash, no client-side gate.
3. `Promise.all([getJoinableGroupsets(), getMyGroupset()])` — both are server actions called *directly server-side* (no network hop; only the client-side call becomes HTTP).
4. Each wraps its Prisma query in `unstable_cache(...)` with tags, so a repeat within 60s hits Next's Data Cache.
5. Results are passed as props to `<Groupset>` **and** to `<CacheSeed>`.
6. `<CacheSeed>` writes them into `sessionStorage` on mount, so a later client-side read of `groupSet` resolves instantly instead of re-hitting the server.

**Mutate** (`app/groupset/Groupset.tsx`):

1. `createGroupset({ team_name })` → HTTP POST to the action.
2. Server re-authenticates, checks `regActive(settings)`, checks you aren't already in a team, checks the name is free, checks you have a school → then `prisma.groupset.create`.
3. **Invalidate server cache:** `revalidateUserData(user.user_id)` + `revalidateTag(TAG_GROUPSETS)`.
4. **Invalidate client cache:** back in the component, `clearSessionCache("groupSet")` and `clearSessionCache("currentUser")`.
5. Refetch and set state.

**Note step 3 and step 4 are two separate caches that must be invalidated separately.** That's the #1 source of bugs you'll hit.

---

## 6. Safety concerns — ranked

### 🔴 Migrations can destroy the production database

No committed migration history + a live Postgres database that was created by Django. If you edit `prisma/schema.prisma` and run `prisma migrate dev`, Prisma will see an empty history against a fully-populated database and try to reconcile — which can mean **dropping and recreating everything.**

`AGENTS.md` sets rules here that should be followed to the letter:

- Never run `prisma migrate reset`, drop a schema/table, or delete data without explicit confirmation.
- Before proposing a migration, apply the *full* history plus the new migration to a **fresh throwaway database** (`npx create-db@latest --json`, gives a DB that self-deletes in 24h) and test against it.
- Never overwrite an existing `DATABASE_URL` in `.env` with a temp one.

If you need to add a column, the safe path is: baseline the existing schema first (`prisma migrate diff` → `migrate resolve --applied`), so Prisma knows the current DB state is already "migration 0". Do this on a throwaway copy before you touch anything real. And **commit the `migrations/` folder** once it exists — otherwise `vercel-build` silently deploys nothing.

### 🔴 Every server action is a public endpoint

Restating it because it's the thing zero-Next-experience developers get wrong. If you write:

```ts
"use server";
export async function deleteAllRegistrations() { ... }   // do not do this
```

…you have just published an unauthenticated destructive endpoint to the internet. Every action starts with `getCurrentUser()` / `requireOrganizer()`. Every single one. Even reads — an ungated read action leaks the entire table.

### 🔴 Field whitelists in mutations are a security boundary, not style

Look at `updateMe` in `functions/actions/account.ts`. It doesn't do `data: body`. It copies fields one at a time:

```ts
if (body.first_name !== undefined) data.first_name = body.first_name;
if (body.gender !== undefined) data.gender = body.gender;
```

That's deliberate. If you "simplify" it to spread `body` into the Prisma update, an attacker POSTs `{"user_type":"O"}` and **promotes themselves to organizer**, or `{"has_paid":true}` and registers for free. Same reasoning in `saveSettings` (`functions/actions/organizer-settings.ts`) and `updateBlogPost` (`functions/actions/blog.ts`). Never pass a client-supplied object straight into Prisma.

### 🟠 There is no middleware — page gating is opt-in per file

No `middleware.ts` exists. Auth happens *only* because each page calls `requireUser()` or `requireOrganizer()`. **A new page you create is public by default.** You have to remember.

Two existing pages illustrate the risk: `app/organizer/settings/page.tsx` has no server gate at all, and `app/organizer/blog/[blog_id]/page.tsx` is a `"use client"` page relying on the `useForwardIfNotOrganizer()` hook. **A client-side redirect is cosmetic, not security** — the user sees the page briefly and can disable JS. Those two happen to be safe only because the underlying *actions* are gated. Don't imitate them; imitate `app/organizer/page.tsx`.

### 🟠 Input validation is thin

Runtime validation is hand-rolled and partial. `registerUser` does not enforce password strength server-side (the 8-char rule in `functions/forms.ts` is **client-side only** — trivially bypassed). There's no email verification: `activate()` (`functions/actions/account.ts`) is a stub that checks a uid exists and ignores the token entirely. `checkEmail` is an open user-enumeration endpoint. There is deliberately no self-serve account deletion action.

None of these are new bugs you'd be introducing — but don't build on them, and consider adding a validation library (zod) at the action boundary for anything new.

### 🟡 Password hashing must stay Django-compatible

`lib/password.ts` implements `pbkdf2_sha256$iterations$salt$hash` so existing Django-era passwords still verify. **Don't swap it for bcrypt/argon2** without a migration plan — you'd lock out every existing user.

### 🟡 Secrets and the client boundary

Never import `lib/prisma.ts` or `auth.ts` into a `"use client"` file. Note that `functions/data.ts` starts with `import "server-only"` — that's a package that makes the build **fail loudly** if a client component imports it. Consider adding it to new server-only modules; it turns a security leak into a compile error.

### 🟡 Redis-free cache is per-instance

`unstable_cache` / `revalidateTag` are Next's built-in caches. On serverless (Vercel) they're shared via the platform's Data Cache, but in dev they're per-process. Don't rely on them for correctness — the 60s TTLs in `functions/actions/shared.ts` exist as a self-healing safety net for exactly this reason.

---

## 7. Non-obvious gotchas that will cost you an afternoon

**`redirect()` throws.** `redirect()` works by throwing a special error that Next catches. So:

```ts
try { await requireUser(); } catch { /* swallows the redirect — do not do this */ }
```

Never wrap `redirect()` or `requireUser()` / `requireOrganizer()` in a try/catch.

**`unstable_cache` serializes through JSON, which destroys `Date`.** This is why there's an entire rehydration layer — `rehydrateCompetitor`, `reBlog`, `reRegistration`, `reGroupset` (`functions/actions/shared.ts`). If you add a cached read that returns a `Date`, and you skip rehydration, the value silently becomes a *string* and something like `date.toLocaleDateString()` crashes at runtime with no type error (TypeScript still believes it's a `Date`). Always map the result through a rehydrator.

**Never put a `BigInt` in a DTO.** `Registration.id` and `CompetitorOrder.id` are `BigInt` in the schema. `JSON.stringify` throws on BigInt, so a cached read containing one blows up. Every DTO in `lib/api.ts` carefully avoids them — keep it that way.

**Auth is *not* wired the standard next-auth way.** Normally you'd have `/api/auth/[...nextauth]` and `useSession()` from `next-auth/react` doing a client fetch. Here: `app/layout.tsx` resolves the session server-side and passes it into a custom `SessionProvider` (`functions/sessionContext.tsx`). So `useSession()` is *already resolved on first render* — there's no `"loading"` status to handle. After login/logout you must call `router.refresh()` to re-run the layout and re-seed it (`app/signin/page.tsx`).

**`getCurrentUser` is `cache()`-wrapped** (`lib/auth.ts`) — React's per-request memo. Call it as many times as you like within one request; it hits the DB once. Same for `loadSettings()`. Neither leaks across requests.

**`routerCompat.tsx` shims react-router.** Use `useNavigate()` / `<Link to=...>` from `@/routerCompat` rather than `next/link` directly — it routes navigation through `NavigationProvider` (`components/NavigationProvider.tsx`), which wraps it in a transition and drives the global loading overlay. Using raw `next/link` means no spinner.

**Redux is *not* your data layer.** `store/` holds only `notif` (toasts) and `loading`. Server data lives in props + sessionStorage. Don't add data slices.

**Tailwind v4 has no config file.** The theme lives in CSS inside `app/globals.css` — `@theme { --color-primary: #0C2340; }` etc. There's no `tailwind.config.js` to edit. Custom `cg-*` component classes are defined in that same file.

**`comp_year` scopes almost everything.** Registrations, group sets, and orders are all keyed by the current competition year, which comes from `settings.reg_year`. A new query that forgets the year filter will silently mix data across years.

**Registration windows.** `regActive()` / `earlyRegActive()` in `lib/settings.ts` gate whether mutations are allowed. Competitor-facing writes check `regActive(settings)` — copy that.

---

## 8. Recipe: adding a feature

Say you're adding a "competitor notes" feature the organizer can edit. Do it in this order:

**1. Schema** — edit `prisma/schema.prisma`. Match the existing style: `@@map("table_name")` snake_case, `@db.Uuid` for ids, `@db.Timestamptz(6)` for timestamps. Then rehearse the migration on a throwaway DB per §6.

**2. DTO + shaper** — in `lib/api.ts`, add a `FooDTO` interface and a `shapeFoo(row): FooDTO` function. Never return raw Prisma rows: the shaper is what stops you leaking `password`, `is_superuser`, etc. Keep BigInt out.

**3. Server action** — new file in `functions/actions/` (or an existing domain module). Template:

```ts
"use server";
import { unstable_cache, revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";
import { requireOrganizer, READ_CACHE_TTL } from "./shared";
import { shapeFoo } from "@/lib/api";

export async function getFoos(): Promise<FooDTO[]> {
  const { error } = await requireOrganizer();     // gate FIRST, outside the cache
  if (error) return [];
  const rows = await unstable_cache(              // cache only the pure query
    async () => (await prisma.foo.findMany()).map(shapeFoo),
    ["foos"],                                     // key parts must be primitives
    { tags: ["foos"], revalidate: READ_CACHE_TTL },
  )();
  return rows.map(reFoo);                         // rehydrate Dates
}

export async function saveFoo(body: FooBody): Promise<Mutation<FooDTO>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  const data = {};                                // whitelist fields explicitly
  if (body.text !== undefined) data.text = body.text;
  const row = await prisma.foo.update({ where: { id: body.id }, data });
  revalidateTag("foos");                          // bust the server cache
  return { data: shapeFoo(row) };
}
```

⚠️ **Auth must run *outside* the `unstable_cache` callback.** Anything reading cookies inside a cached function will either error or — far worse — get cached and served to the wrong user. Only pure, primitive-keyed Prisma reads go inside.

**4. Export it** from `functions/actions/index.ts`.

**5. Cache key** — add to `functions/cacheKeys.ts`.

**6. Client fetcher** — add to `functions/cachedFetchers.ts` and re-export from `functions/index.ts`.

**7. The page** — `app/organizer/foo/page.tsx` (server) + `app/organizer/foo/Foo.tsx` (client):

```tsx
// page.tsx — server
export default async function Page() {
  await requireOrganizer();                                  // gate BEFORE fetching
  const foos = await getFoos();
  return (<>
    <CacheSeed entries={{ [cacheKeys.foos]: foos }} />
    <Foo foos={foos} />
  </>);
}
```

**8. Wire up invalidation on the client** — after a successful mutation, `clearSessionCache(cacheKeys.foos)` for *every* key whose contents changed. This is the step people forget: the server cache is fresh but the browser keeps serving stale sessionStorage until the tab closes. Look at `app/organizer/blog/[blog_id]/page.tsx` — one edit clears three keys.

**9. Verify** — `npm run type-check` (`tsc --noEmit`) then `npm run build`. `AGENTS.md` says to stop once it compiles rather than doing runtime tests. `strict: true` is on, so the type checker catches a lot.

---

## 9. Quick reference

```bash
npm install          # required first — node_modules is missing
npm run dev          # http://localhost:3000
npm run type-check   # tsc --noEmit — your main correctness gate
npm run build        # full production build
npm run seed         # prisma/seed.ts — colleges + events reference data
npx prisma studio    # DB browser (careful: it writes)
npx prisma generate  # regenerate client after schema edits
```

**The three rules that matter most:**

1. Every server action authenticates and authorizes itself — no exceptions, reads included.
2. Never spread a client-supplied object into a Prisma write; whitelist fields explicitly.
3. Two caches invalidate separately — `revalidateTag` on the server *and* `clearSessionCache` on the client.
