"use server";

/**
 * Admin-only actions behind `/admin`.
 *
 * @remarks
 * Two operations, both of which change who can do what: starting a new
 * competition year, and promoting a user to a School account eligible to host
 * one.
 *
 * Several writes here are deliberately split into separate statements rather
 * than nested Prisma writes — a nested write forces an interactive transaction,
 * which the Postgres driver adapter serves over a WebSocket. The tradeoffs of
 * that split are noted on each action.
 *
 * @packageDocumentation
 */

import { updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { adminGate, settingsWritable, settingsDateErrors, actionError } from "./shared";
import type { Mutation, SettingsBody, CreateSchoolAccountBody } from "./shared";

/**
 * Creates a new competition: a fresh settings row.
 *
 * @remarks
 * Always **inserts**, never updates. `loadSettings` reads the most recently
 * created row, so the new one immediately becomes the active competition and the
 * previous year's settings are kept as history. Use `saveSettings` to edit the
 * current competition instead.
 *
 * @param body - The settings. Year, both registration dates, both costs, contact
 * email, and host are required; the early tier, due date, and competition date
 * are optional.
 * @returns `{ data: null }` on success, or field errors. No row is returned —
 * an `include` would force an interactive transaction over a WebSocket.
 */
export async function createSettings(body: SettingsBody): Promise<Mutation<null>> {
  const { error } = await adminGate();
  if (error) return { error };

  // Required columns for a fresh row (early_* / due_date / comp_date are optional).
  if (body.reg_year == null) return { error: { reg_year: "Registration year is required." } };
  if (!body.reg_start) return { error: { reg_start: "Registration start is required." } };
  if (!body.reg_end) return { error: { reg_end: "Registration end is required." } };
  if (body.reg_cost_base == null) return { error: { reg_cost_base: "Base cost is required." } };
  if (body.reg_cost_event == null) return { error: { reg_cost_event: "Per-event cost is required." } };
  if (!body.contact_email) return { error: { contact_email: "Contact email is required." } };
  if (!body.host) return { error: { host: "Host user email is required." } };

  const dateErrors = settingsDateErrors(body);
  if (dateErrors) return { error: dateErrors };

  try {
    const host = await prisma.user.findUnique({ where: { email: body.host }, select: { user_id: true } });
    if (!host) return { error: { host: "Host user not found." } };

    await prisma.settings.create({
      data: { ...settingsWritable(body), host_id: host.user_id } as Prisma.SettingsUncheckedCreateInput,
    });
    updateTag("settings");
    return { data: null };
  } catch (err) {
    return { error: actionError("createSettings", err, "Could not create the settings.") };
  }
}

/**
 * Promotes an existing user to a School account, linked to a college.
 *
 * @remarks
 * The account must already exist — this promotes, it does not create. Being a
 * School account does not by itself grant organizer access: that comes from
 * being named host on the current settings row.
 *
 * The profile link and the promotion are **two separate statements**, so a
 * failure on the second leaves the profile written. The error message says the
 * setup is incomplete rather than that nothing happened; re-running the action
 * is safe and idempotent.
 *
 * @param body - The user's email, the college id, and optional name corrections.
 * @returns The promoted account, or field errors.
 */
export async function createSchoolAccount(
  body: CreateSchoolAccountBody,
): Promise<Mutation<{ user_id: string; email: string }>> {
  const { error } = await adminGate();
  if (error) return { error };

  const { email } = body ?? {};
  if (!email) return { error: { email: "Email is required." } };
  if (!body.college) return { error: { college: "College is required." } };

  try {
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

    // 1) Point the one-to-one CollegeProfile at the chosen college.
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
  } catch (err) {
    return { error: actionError("createSchoolAccount", err, "Could not finish setting up the school account. Check the account and try again.") };
  }
}
