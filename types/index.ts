/**
 * Shared UI-facing types.
 *
 * @remarks
 * Prisma payloads and DTO shapes are **not** here — those live in
 * {@link "lib/api"}.
 *
 * @packageDocumentation
 */

/**
 * One event row as the registration UI tracks it while a competitor builds up
 * their selection, and the shape `createRegistrations` accepts.
 */
export interface RegEventItem {
  event_code: string;
  nandu_str?: string;
}
