"use server";

// Admin-only server actions backing the /admin page: create a brand-new
// settings row (e.g. for a new competition year) and promote an existing user
// to a School account (user_type "School" plus its one-to-one CollegeProfile).

import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { shapeSettings } from "@/lib/api";
import type { SettingsDTO } from "@/lib/api";
import { requireAdmin, settingsWritable } from "./shared";
import type { Mutation, SettingsBody, CreateSchoolAccountBody } from "./shared";

// Always inserts a NEW settings row. loadSettings() reads the most-recently
// created row, so the row created here becomes the active competition settings.
export async function createSettings(body: SettingsBody): Promise<Mutation<SettingsDTO | null>> {
  const { error } = await requireAdmin();
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
    include: { host: true },
  });
  revalidateTag("settings");
  return { data: shapeSettings(s) };
}

// Promotes an EXISTING user to a School account: flips user_type to "School"
// and links the chosen college via its one-to-one CollegeProfile (created if the
// user has none yet, otherwise repointed). first_name/last_name are updated only
// when supplied.
//
// The two writes are issued as SEPARATE single-statement queries rather than one
// nested write on purpose. A nested create/update makes Prisma open an
// interactive transaction, which the Prisma Postgres serverless adapter runs
// over a WebSocket session (plain single statements go over HTTP). Keeping the
// writes separate keeps the whole operation on HTTP and off the WebSocket. The
// action is idempotent, so re-running it self-heals if either write fails.
export async function createSchoolAccount(
  body: CreateSchoolAccountBody,
): Promise<Mutation<{ user_id: string; email: string }>> {
  const { error } = await requireAdmin();
  if (error) return { error };

  const { email } = body ?? {};
  if (!email) return { error: { email: "Email is required." } };
  if (!body.college) return { error: { college: "College is required." } };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { user_id: true, college_profile: { select: { user_id: true } } },
  });
  if (!user) return { error: { email: "No user found with that email." } };

  const college = await prisma.college.findUnique({
    where: { college_id: body.college },
    select: { college_id: true },
  });
  if (!college) return { error: { college: "College not found." } };

  // 1) Ensure the one-to-one CollegeProfile links the chosen college. Create vs
  //    update are separate single statements — never a nested write.
  if (user.college_profile) {
    await prisma.collegeProfile.update({
      where: { user_id: user.user_id },
      data: { college_id: college.college_id },
    });
  } else {
    // NB: inserted via raw SQL, not prisma.collegeProfile.create, to dodge a
    // @prisma/adapter-ppg (v7.9.1) bug: it serializes an empty Int[] param to
    // the wire as "" and Postgres rejects it (22P02 "malformed array literal").
    // Prisma emits that empty-array param for host_years on ANY create —
    // whether the column is omitted (its @default([])) or passed [] explicitly.
    // Omitting the column here lets its own DEFAULT ARRAY[]::INTEGER[] fill it,
    // so no empty-array param is ever sent.
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
  revalidateTag("school-accounts");
  return { data: { user_id: user.user_id, email } };
}
