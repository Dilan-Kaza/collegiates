"use server";

/**
 * Server actions for the competition settings and the event catalogue.
 *
 * @remarks
 * The settings write and the catalogue read are organizer-gated. The settings
 * *read* is not: it returns the same public payload the home and tournament
 * pages already render to anonymous visitors.
 *
 * @packageDocumentation
 */

import { unstable_cache, updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { isAdmin } from "@/lib/auth";
import { getSettings } from "@functions/data";
import { shapeEvent } from "@/lib/api";
import type { EventDTO, SettingsDTO } from "@/lib/api";
import {
  READ_CACHE_TTL, TAG_EVENTS, organizerGate, settingsWritable, settingsDateErrors, actionError,
} from "./shared";
import type { Mutation, SettingsBody } from "./shared";

/**
 * Saves the competition settings, creating the row if there is none yet.
 *
 * @remarks
 * Changing `host` is an **admin-only** operation, not an ordinary setting:
 * `host_id` is what `canAccessOrganizer` resolves organizer access from, so
 * writing it grants permissions. The organizer settings form never submits it.
 *
 * Dates are validated before the write and reported on their own fields —
 * `parseSettingsDate` maps an unparseable day to null, which `settingsWritable`
 * would otherwise treat as "not supplied" and silently ignore.
 *
 * @param body - The writable settings columns. Absent fields are left alone.
 * @returns `{ data: null }` on success. No row is returned: callers only read
 * `error`, and the `settings` tag update refreshes the page. Returning one would
 * need an `include`, forcing an interactive transaction over a WebSocket.
 */
export async function saveSettings(body: SettingsBody): Promise<Mutation<null>> {
  const { user, error } = await organizerGate();
  if (error) return { error };

  // Writing host_id grants organizer access, so it is admin-only.
  if (body.host !== undefined && !isAdmin(user)) {
    return { error: { host: "Only an admin can change the settings host." } };
  }

  const dateErrors = settingsDateErrors(body);
  if (dateErrors) return { error: dateErrors };

  try {
    // The host lookup and the current settings row are independent, so they go out
    // together rather than one after the other.
    const [host, existing] = await Promise.all([
      body.host !== undefined
        ? prisma.user.findUnique({ where: { email: body.host }, select: { user_id: true } })
        : null,
      loadSettings(),
    ]);
    let host_id: string | undefined;
    if (body.host !== undefined) {
      if (!host) return { error: { host: "Host user not found." } };
      host_id = host.user_id;
    }

    if (existing) {
      const data = settingsWritable(body);
      if (host_id) data.host_id = host_id;
      (Object.keys(data) as (keyof typeof data)[]).forEach((k) => {
        if (data[k] === undefined) delete data[k];
      });
      await prisma.settings.update({ where: { id: existing.id }, data });
    } else {
      if (!host_id) return { error: { host: "Host user not found." } };
      await prisma.settings.create({
        data: { ...settingsWritable(body), host_id } as Prisma.SettingsUncheckedCreateInput,
      });
    }
    updateTag("settings");
    return { data: null };
  } catch (err) {
    return { error: actionError("saveSettings", err, "Could not save the settings.") };
  }
}

/**
 * The competition settings, callable from the browser.
 *
 * @remarks
 * {@link "functions/data"} has the same read, but that module is `server-only`
 * and reaches the browser only as props. A component binding the `settings`
 * cache entry needs this to refill it after a save drops the key.
 *
 * Ungated for the same reason the home page is: this DTO is already serialized
 * to anonymous visitors. It shares the `settings` Data Cache entry.
 *
 * @returns The settings, or `null` before a first competition exists.
 */
export async function getSharedSettings(): Promise<SettingsDTO | null> {
  return getSettings();
}

/**
 * The whole event catalogue, unfiltered, for the event builder.
 *
 * @remarks
 * Unlike `getCompetitorEvents`, nothing is filtered by gender, level, or
 * eligibility — an organizer schedules every event that exists.
 *
 * @returns Every event, or `[]` for a denied read.
 */
export async function getOrganizerEvents(): Promise<EventDTO[]> {
  const { error } = await organizerGate();
  if (error) return [];
  return unstable_cache(
    async (): Promise<EventDTO[]> => {
      const events = await prisma.event.findMany();
      return events.map(shapeEvent);
    },
    ["organizer-events"],
    { tags: [TAG_EVENTS], revalidate: READ_CACHE_TTL },
  )();
}
