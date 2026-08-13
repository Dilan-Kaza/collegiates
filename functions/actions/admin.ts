"use server";

/**
 * Admin-only actions behind `/admin`.
 *
 * @remarks
 * Two operations, both of which change who can do what: starting a new
 * competition year, and creating a School account eligible to host one.
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
import { hashPassword, randomPassword } from "@/lib/password";
import { sendEmail, fromAddress } from "@/lib/email";
import { schoolAccountInviteEmail } from "@/lib/email-templates";
import { issueToken, TokenPurpose } from "@/lib/tokens";
import { adminGate, settingsWritable, settingsDateErrors, actionError, appUrl } from "./shared";
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
 * Creates a School account for an address that has none, linked to a college,
 * and emails its owner an invitation to set a password.
 *
 * @remarks
 * The account is created **inactive**, holding a random password from
 * {@link randomPassword} that nobody — not even the admin who created it — ever
 * sees. The emailed link is therefore the only way in: it sets the first
 * password and activates the account together, in `setInitialPassword`.
 *
 * Being a School account does not by itself grant organizer access: that comes
 * from being named host on the current settings row.
 *
 * Delivery is checked twice, for the same reason as `registerUser` — an account
 * written without a sendable invitation is stranded, inactive yet holding the
 * address, so it can neither sign in nor be created again:
 *
 * - **Before the insert**, `appUrl()` and `fromAddress()` are called for their
 *   throw, catching a missing `NEXT_PUBLIC_APP_URL` or `SES_FROM_EMAIL` while
 *   nothing has been saved.
 * - **After the insert**, a failed profile write or send rolls the user back —
 *   the profile and token rows cascade with it.
 *
 * The user row, the college profile, and the token are **separate statements**
 * rather than one nested write, which would force an interactive transaction
 * over a WebSocket; the rollback above stands in for it.
 *
 * The account's `first_name` is set to the college's name — a school account
 * stands for the college rather than for a person — so no name is asked for.
 *
 * @param body - The new account's email and the college id.
 * @returns The created account, or field errors.
 */
export async function createSchoolAccount(
  body: CreateSchoolAccountBody,
): Promise<Mutation<{ user_id: string; email: string }>> {
  const { error } = await adminGate();
  if (error) return { error };

  const email = body?.email?.trim().toLowerCase();
  if (!email) return { error: { email: "Email is required." } };
  if (!body.college) return { error: { college: "College is required." } };

  try {
    // Independent lookups, so they go out together.
    const [existing, college] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { user_id: true } }),
      prisma.college.findUnique({
        where: { college_id: body.college },
        select: { college_id: true, college_name: true },
      }),
    ]);
    if (existing) return { error: { email: "A user with this email already exists." } };
    if (!college) return { error: { college: "College not found." } };

    // Called for their throw: fail on missing config while nothing is saved yet.
    const baseUrl = appUrl();
    fromAddress();

    const user = await prisma.user.create({
      data: {
        email,
        password: hashPassword(randomPassword()),
        user_type: "School",
        is_active: false,
        // A school account stands for the college, not a person: `first_name`
        // carries the college's name so every screen rendering a user's name
        // shows the school. `last_name` stays empty for the same reason.
        first_name: college.college_name,
      },
      select: { user_id: true, email: true },
    });

    try {
      // Raw SQL, not .create(): adapter-ppg 7.9.1 sends host_years' empty Int[] as
      // "" (22P02). Omitting the column lets its own DEFAULT fill it instead.
      await prisma.$executeRaw`
        INSERT INTO "college_profile" ("user_id", "college_id")
        VALUES (${user.user_id}::uuid, ${college.college_id}::uuid)
      `;

      const token = await issueToken(user.user_id, TokenPurpose.SchoolInvite);
      const link = `${baseUrl}/set-password/${user.user_id}/${token}`;
      await sendEmail(user.email, schoolAccountInviteEmail(link));
    } catch (err) {
      // Undo the insert rather than leave an account nobody can reach; the
      // profile and token rows cascade with the user.
      await prisma.user.delete({ where: { user_id: user.user_id } }).catch(() => {});
      return {
        error: actionError(
          "createSchoolAccount/invite",
          err,
          "Could not send the invitation email. Please try again.",
        ),
      };
    }

    // The account becomes selectable as a settings host, so drop the cached list
    // backing the admin console's host dropdown.
    updateTag("school-accounts");
    return { data: { user_id: user.user_id, email } };
  } catch (err) {
    // The findUnique above isn't atomic with the insert, so two admins creating
    // the same address at once land here as P2002 — report it on the field.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: { email: "A user with this email already exists." } };
    }
    return { error: actionError("createSchoolAccount", err, "Could not create the school account.") };
  }
}
