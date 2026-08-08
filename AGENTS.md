<!-- BEGIN:nextjs-agent-rules -->
 
# Next.js: ALWAYS read docs before coding
 
Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.
 
Do not attempt to do runtime tests, once the code compiles stop.

Do not create api endpoints, instead use server actions.

# Prisma:

- When a task needs a database for testing or prototyping, run
  `npx create-db@latest --json` and use the `connectionString` field as
  `DATABASE_URL` for that task. The database is temporary and deletes
  itself after 24 hours. If the work should be kept, show me the `claimUrl`.
- Never run `prisma migrate reset`, drop a schema or table, or delete
  data without my explicit confirmation. The only exception is a
  throwaway database you provisioned for the current task; even there,
  surface Prisma's guardrail prompt to me, never self-approve it.
- Before proposing a migration, apply the full migration history, ending
  with the new migration, to a fresh throwaway database
  (`npx create-db@latest --json`) and run the tests against it. Only
  propose migrations that passed this rehearsal.
- Prefer `--json` output when a CLI offers it, and parse the fields
  instead of scraping human-formatted terminal output.
- Keep connection strings in environment variables only. Never put them
  in source files or commits, and never overwrite an existing
  `DATABASE_URL` in `.env` with a temporary one.

Do not attempt to start your own database or manually build a migration.

Do not use prisma to create a temporary database.

Do not change what libraries are used unless explicitly asked to

<!-- END:nextjs-agent-rules -->