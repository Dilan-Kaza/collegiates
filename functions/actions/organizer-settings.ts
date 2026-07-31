"use server";

// Organizer server actions for competition settings and the event catalogue.

import { unstable_cache, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { shapeSettings, shapeEvent } from "@/lib/api";
import type { SettingsDTO, EventDTO } from "@/lib/api";
import { READ_CACHE_TTL, TAG_EVENTS, requireOrganizer, settingsWritable } from "./shared";
import type { Mutation, SettingsBody } from "./shared";

export async function saveSettings(body: SettingsBody): Promise<Mutation<SettingsDTO | null>> {
  const { error } = await requireOrganizer();
  if (error) return { error };

  let host_id: string | undefined;
  if (body.host !== undefined) {
    const user = await prisma.user.findUnique({ where: { email: body.host } });
    if (!user) return { error: { host: "Host user not found." } };
    host_id = user.user_id;
  }

  const existing = await loadSettings();
  let s;
  if (existing) {
    const data = settingsWritable(body);
    if (host_id) data.host_id = host_id;
    (Object.keys(data) as (keyof typeof data)[]).forEach((k) => {
      if (data[k] === undefined) delete data[k];
    });
    s = await prisma.settings.update({ where: { id: existing.id }, data, include: { host: true } });
  } else {
    if (!host_id) return { error: { host: "Host user not found." } };
    s = await prisma.settings.create({
      data: { ...settingsWritable(body), host_id } as Prisma.SettingsUncheckedCreateInput,
      include: { host: true },
    });
  }
  revalidateTag("settings");
  return { data: shapeSettings(s) };
}

export async function getOrganizerEvents(): Promise<EventDTO[]> {
  const { error } = await requireOrganizer();
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
