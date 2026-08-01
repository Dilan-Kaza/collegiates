# Collegiate Wushu

Registration and tournament-management site for collegiate wushu competitions.
Competitors register for events and form groupsets; organizers manage
registrations, build the event order, and publish blog posts.

## Stack

| Layer     | Choice |
| --------- | ------ |
| Framework | Next.js 16 (App Router, React 19, server actions) |
| Database  | Prisma 7 against Prisma Postgres via the `@prisma/adapter-ppg` driver adapter |
| Auth      | Auth.js (NextAuth v5) — email/password credentials, JWT sessions |
| State     | Redux Toolkit (`store/`) for notifications and the loading overlay |
| Styling   | Tailwind CSS 4 + daisyUI, Bootstrap Icons, Typekit fonts |

There are no API route handlers. All reads and mutations go through server
actions in [`functions/actions/`](functions/actions/), and the session is read
server-side via `auth()`.

## Getting started

Requires Node 24+ — the Prisma seed and `create-admin` scripts run `.ts` files
directly.

```bash
npm install          # runs `prisma generate` via postinstall
npm run dev          # http://localhost:3000
```

Create a `.env` file first:

```bash
# Prisma Postgres *Direct TCP* URL. An Accelerate `prisma+postgres://` URL is
# rejected by the driver adapter — see lib/prisma.ts.
DATABASE_URL="postgres://<id>:<key>@db.prisma.io:5432/postgres?sslmode=require"

# Auth.js session signing secret (`npx auth secret` generates one).
AUTH_SECRET="..."

# Google Sheets API key, used by the sheets client in lib/apiClient.ts.
NEXT_PUBLIC_GOOGLE_API_KEY="..."
```

Then set up the database:

```bash
npx prisma migrate dev   # apply migrations
npm run seed             # reference data: colleges + events
npm run create-admin     # interactive; creates an /admin console user
```

`create-admin` also reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` to pre-answer its
prompts — run it with `--help` for the full flag list.

## Scripts

| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm run type-check` | `tsc --noEmit` |
| `npm run seed` | Seed colleges and events |
| `npm run create-admin` | Create an admin user |
| `npm run vercel-build` | `prisma migrate deploy && next build` (deploy target) |

## Layout

```
app/              Routes. Each page.tsx is a server component that fetches and
                  passes data to a sibling client component (Home.tsx, etc.).
components/       Shared UI, re-exported from components/index.ts.
  event-builder/  Drag-and-drop event-order builder.
  rules/          Static rules-page sections.
functions/
  actions/        Server actions — the entire read/write surface.
  sessionContext  Client session provider; sessionCache is its sessionStorage layer.
lib/
  api/            DTOs, enums, Prisma payload types, and shapers. Import from "@/lib/api".
  prisma.ts       Singleton PrismaClient with the Postgres driver adapter.
  auth.ts         Server-side current-user helpers.
prisma/           Schema, migrations, and seed data.
store/            Redux store and slices.
```

Path aliases (see [`tsconfig.json`](tsconfig.json)): `@/*` → repo root, plus
`@components`, `@functions`, and `@slices`.

## Deploying

Vercel, using `vercel-build` so migrations are applied ahead of the build.
`DATABASE_URL`, `AUTH_SECRET`, and `NEXT_PUBLIC_GOOGLE_API_KEY` must be set in
the project's environment variables.
