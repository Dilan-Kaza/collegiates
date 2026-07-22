"use server";

// Organizer server actions for competition settings and the event catalogue.

import { unstable_cache, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { shapeSettings, shapeEvent } from "@/lib/api";
import type { SettingsDTO, EventDTO } from "@/lib/api";
import { READ_CACHE_TTL, TAG_EVENTS, requireOrganizer } from "./shared";
import type { Mutation, SettingsBody } from "./shared";

function settingsWritable(body: SettingsBody): Prisma.SettingsUncheckedUpdateInput {
  return {
    reg_year: body.reg_year,
    early_reg_start: body.early_reg_start ? new Date(body.early_reg_start) : null,
    early_reg_cost_first: body.early_reg_cost_first ?? null,
    early_reg_cost_extra: body.early_reg_cost_extra ?? null,
    reg_start: body.reg_start ? new Date(body.reg_start) : undefined,
    reg_end: body.reg_end ? new Date(body.reg_end) : undefined,
    reg_cost_first: body.reg_cost_first,
    reg_cost_extra: body.reg_cost_extra,
    comp_date: body.comp_date ? new Date(body.comp_date) : null,
    contact_email: body.contact_email,
    order_public: body.order_public,
  };
}

export async function saveSettings(body: SettingsBody): Promise<Mutation<SettingsDTO | null>> {
  const { error } = await requireOrganizer();
  if (error) return { error };

  let school_id: string | undefined;
  if (body.host !== undefined) {
    const college = await prisma.college.findUnique({ where: { college_name: body.host } });
    if (!college) return { error: { host: "College not found." } };
    school_id = college.college_id;
  }

  const existing = await loadSettings();
  let s;
  if (existing) {
    const data = settingsWritable(body);
    if (school_id) data.school_id = school_id;
    (Object.keys(data) as (keyof typeof data)[]).forEach((k) => {
      if (data[k] === undefined) delete data[k];
    });
    s = await prisma.settings.update({ where: { id: existing.id }, data, include: { host: true } });
  } else {
    if (!school_id) return { error: { host: "College not found." } };
    s = await prisma.settings.create({
      data: { ...settingsWritable(body), school_id } as Prisma.SettingsUncheckedCreateInput,
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
