// Response helpers. Bodies are serialized with superjson so rich types survive
// the wire — Date is preserved and reconstructed client-side (lib/apiClient.ts).
import superjson from "superjson";

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(superjson.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers || {}) },
  });
}

export const ok = (data: unknown): Response => json(data, { status: 200 });
export const created = (data: unknown): Response => json(data, { status: 201 });
export const badRequest = (detail: string | Record<string, unknown>): Response =>
  json(typeof detail === "string" ? { detail } : detail, { status: 400 });
export const unauthorized = (): Response =>
  json({ detail: "Authentication credentials were not provided." }, { status: 401 });
export const forbidden = (detail = "You do not have permission to perform this action."): Response =>
  json({ detail }, { status: 403 });
export const notFound = (detail = "Not found."): Response => json({ detail }, { status: 404 });
