"use server";

// Admin-only actions behind /admin: create a new settings row (e.g. for a new
// competition year) and promote an existing user to a School account.

import { updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { shapeSettings, SETTINGS_INCLUDE } from "@/lib/api";
import type { SettingsDTO } from "@/lib/api";
import { adminGate, settingsWritable } from "./shared";
import type { Mutation, SettingsBody, CreateSchoolAccountBody } from "./shared";

// Always inserts a NEW settings row. loadSettings() reads the most-recently
// created row, so the row created here becomes the active competition settings.
export async function createSettings(body: SettingsBody): Promise<Mutation<SettingsDTO | null>> {
  const { error } = await adminGate();
  if (error) return { error };

  // Required columns for a fresh row (early_* / due_date / comp_date are optional).
  if (body.reg_year == null) return { error: { reg_year: "Registration year is required." } };
  if (!body.reg_start) return { error: { reg_start: "Registration start is required." } };
  if (!body.reg_end) return { error: { reg_end: "Registration end is required." } };
  if (body.reg_cost_first == null) return { error: { reg_cost_first: "First-event cost is required." } };
  if (body.reg_cost_extra == null) return { error: { reg_cost_extra: "Extra-event cost is required." } };
  if (!body.contact_email) return { error: { contact_email: "Contact email is required." } };
  if (!body.host) return { error: { host: "Host user email is required." } };

  const host = await prisma.user.findUnique({ where: { email: body.host }, select: { user_id: true } });
  if (!host) return { error: { host: "Host user not found." } };

  const s = await prisma.settings.create({
    data: { ...settingsWritable(body), host_id: host.user_id } as Prisma.SettingsUncheckedCreateInput,
    include: SETTINGS_INCLUDE,
  });
  updateTag("settings");
  return { data: shapeSettings(s) };
}

// Promotes an existing user to a School account and links its CollegeProfile. Two
// separate statements — a nested write forces an interactive tx over a WebSocket.
export async function createSchoolAccount(
  body: CreateSchoolAccountBody,
): Promise<Mutation<{ user_id: string; email: string }>> {
  const { error } = await adminGate();
  if (error) return { error };

  const { email } = body ?? {};
  if (!email) return { error: { email: "Email is required." } };
  if (!body.college) return { error: { college: "College is required." } };

  // Independent lookups, so they go out together.
  const [user, college] = await Promise.all([
    prisma.user.findUnique({
      where: { email },
      select: { user_id: true, college_profile: { select: { user_id: true } } },
    }),
    prisma.college.findUnique({
      where: { college_id: body.college },
      select: { college_id: true },
    }),
  ]);
  if (!user) return { error: { email: "No user found with that email." } };
  if (!college) return { error: { college: "College not found." } };

  // 1) Point the one-to-one CollegeProfile at the chosen college. Create vs
  //    update stay separate single statements — never a nested write.
  if (user.college_profile) {
    await prisma.collegeProfile.update({
      where: { user_id: user.user_id },
      data: { college_id: college.college_id },
    });
  } else {
    // Raw SQL, not .create(): adapter-ppg 7.9.1 sends host_years' empty Int[] as
    // "" (22P02). Omitting the column lets its own DEFAULT fill it instead.
    await prisma.$executeRaw`
      INSERT INTO "college_profile" ("user_id", "college_id")
      VALUES (${user.user_id}::uuid, ${college.college_id}::uuid)
    `;
  }

  // 2) Promote the account. Optional name edits ride along on this same UPDATE.
  await prisma.user.update({
    where: { user_id: user.user_id },
    data: {
      user_type: "School",
      is_active: true,
      ...(body.first_name ? { first_name: body.first_name } : {}),
      ...(body.last_name ? { last_name: body.last_name } : {}),
    },
  });

  // The account becomes selectable as a settings host, so drop the cached list
  // backing the admin console's host dropdown.
  updateTag("school-accounts");
  return { data: { user_id: user.user_id, email } };
}
