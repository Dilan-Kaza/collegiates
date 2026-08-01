"use server";

// Organizer server actions for competition settings and the event catalogue.

import { unstable_cache, updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { isAdmin } from "@/lib/auth";
import { shapeSettings, shapeEvent, SETTINGS_INCLUDE } from "@/lib/api";
import type { SettingsDTO, EventDTO } from "@/lib/api";
import { READ_CACHE_TTL, TAG_EVENTS, organizerGate, settingsWritable } from "./shared";
import type { Mutation, SettingsBody } from "./shared";

export async function saveSettings(body: SettingsBody): Promise<Mutation<SettingsDTO | null>> {
  const { user, error } = await organizerGate();
  if (error) return { error };

  // host_id is what organizerGate resolves organizer access from, so writing it
  // is a permission grant, not a setting: only an admin may. An organizer host
  // could otherwise hand its own console to any account, or take it from itself.
  // The organizer settings form never submits `host` — the admin console does.
  if (body.host !== undefined && !isAdmin(user)) {
    return { error: { host: "Only an admin can change the settings host." } };
  }

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

  let s;
  if (existing) {
    const data = settingsWritable(body);
    if (host_id) data.host_id = host_id;
    (Object.keys(data) as (keyof typeof data)[]).forEach((k) => {
      if (data[k] === undefined) delete data[k];
    });
    s = await prisma.settings.update({ where: { id: existing.id }, data, include: SETTINGS_INCLUDE });
  } else {
    if (!host_id) return { error: { host: "Host user not found." } };
    s = await prisma.settings.create({
      data: { ...settingsWritable(body), host_id } as Prisma.SettingsUncheckedCreateInput,
      include: SETTINGS_INCLUDE,
    });
  }
  updateTag("settings");
  return { data: shapeSettings(s) };
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
