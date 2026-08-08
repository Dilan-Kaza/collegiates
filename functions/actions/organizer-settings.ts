"use server";

// Organizer server actions for competition settings and the event catalogue.

import { unstable_cache, updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { isAdmin } from "@/lib/auth";
import { shapeEvent } from "@/lib/api";
import type { EventDTO } from "@/lib/api";
import {
  READ_CACHE_TTL, TAG_EVENTS, organizerGate, settingsWritable, settingsDateErrors, actionError,
} from "./shared";
import type { Mutation, SettingsBody } from "./shared";

// Returns no row: the caller only reads `error`, and the "settings" tag updated below refreshes the
// page. An `include` would force an interactive transaction, served over a WebSocket.
export async function saveSettings(body: SettingsBody): Promise<Mutation<null>> {
  const { user, error } = await organizerGate();
  if (error) return { error };

  // host_id is what organizerGate resolves organizer access from, so writing it is a permission
  // grant, not a setting: admin only. The organizer settings form never submits `host`.
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
