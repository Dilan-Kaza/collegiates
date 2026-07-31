// Shared UI-facing types (not Prisma/DTO shapes — those live in lib/api.ts).

// A single event row as tracked by the registration UI while a competitor
// builds up their selection.
export interface RegEventItem {
  event_code: string;
  nandu_str?: string;
}
