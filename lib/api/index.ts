/**
 * The shared API surface: enum bridges, DTO shapes, Prisma payload types, and
 * the serializer-equivalent shapers.
 *
 * @remarks
 * Import from `"@/lib/api"` rather than reaching into the individual modules —
 * they are split for authoring, not for consumption.
 *
 * @packageDocumentation
 */
export * from "./enums";
export * from "./dto";
export * from "./payloads";
export * from "./shapers";
