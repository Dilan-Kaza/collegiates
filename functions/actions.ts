"use server";

// Server Actions replacing the internal /api routes. Each exported function is
// an RPC callable directly from client components. Reads return data (or null/[]
// when unauthenticated/forbidden); mutations return { data } on success or
// { error } (a field->message object) on failure.

import { revalidateTag } from "next/cache";
import { AuthError } from "next-auth";
import { Prisma, type User } from "@prisma/client";
import prisma from "@/lib/prisma";
import { signIn, signOut } from "@/auth";
import { hashPassword } from "@/lib/password";
import { getCurrentUser, isOrganizer, isCompetitor } from "@/lib/auth";
import { loadSettings, regActive } from "@/lib/settings";
import {
  shapeCompetitor, shapeRegistration, shapeEvent, shapeBlog,
  shapeSettings, shapeGroupset, shapeOrganizerGroupset, shapeOrganizerRegistration,
  shapeOrder,
} from "@/lib/api";
import type {
  CompetitorDTO, RegistrationDTO, EventDTO, BlogDTO, SettingsDTO,
  GroupsetDTO, OrganizerGroupsetDTO, OrganizerRegistrationDTO, OrderDTO,
} from "@/lib/api";

// ---------- result / body types ----------

export type FieldErrors = Record<string, string>;
export type Mutation<T> = { data: T; error?: undefined } | { data?: undefined; error: FieldErrors };

interface RegisterBody {
  email?: string;
  password?: string;
  re_password?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  school?: string;
  student_type?: string;
  first_comp?: string | number;
  skill_level?: string;
  grad_date?: string;
}

interface UpdateMeBody {
  first_name?: string;
  last_name?: string;
  gender?: string;
  student_type?: string;
  skill_level?: string;
  first_comp?: string | number;
  school?: string | null;
  grad_date?: string | null;
}

interface RegistrationItem {
  event_code: string;
  nandu_str?: string;
}

interface SettingsBody {
  reg_year?: number;
  early_reg_start?: string | null;
  early_reg_cost_first?: number | null;
  early_reg_cost_extra?: number | null;
  reg_start?: string;
  reg_end?: string;
  reg_cost_first?: number;
  reg_cost_extra?: number;
  comp_date?: string | null;
  contact_email?: string;
  host?: string;
}

interface BlogBody {
  author?: string;
  category?: string;
  title?: string;
  blog_content?: string;
}

interface OrganizerRegFilters {
  has_paid?: boolean;
  proof_of_reg?: boolean;
  is_competing?: boolean;
  school?: string;
}

interface RegistrationInputItem {
  event: string;
  nandu_str?: string;
}

interface UpdateOrganizerRegBody {
  registration_input?: RegistrationInputItem[];
  has_paid?: boolean;
  proof_of_reg?: boolean;
  is_competing?: boolean;
}

interface CreateOrganizerGroupsetBody {
  team_name: string;
  school: string;
  leader?: string;
  members?: string[];
}

interface UpdateOrganizerGroupsetBody {
  team_name?: string;
  school?: string;
  leader?: string;
  members?: string[];
}

// Event-order write payload (mirrors the Django OrderSerializer / EventOrderSerializer
// write path). Each ring item is either an event (event_id + competitor_list) or a
// break (break_length, no event_id). `id` is present when re-saving an existing slot.
type RingKey = "ring1" | "ring2" | "ring3";

interface EventOrderCompetitorInput {
  id?: string;
  order?: number;
}

interface EventOrderInput {
  id?: string;
  order?: number;
  event_id?: string; // event_code; absent for breaks
  name?: string;
  break_length?: number;
  competitor_list?: EventOrderCompetitorInput[];
}

interface OrderBody {
  ring1?: EventOrderInput[];
  ring2?: EventOrderInput[];
  ring3?: EventOrderInput[];
  public?: boolean;
}

// NOTE: the `school + members.member` include is written inline at each query
// site so Prisma can infer the related payload — a shared object typed as
// Prisma.GroupsetInclude would widen and drop the relations from the result.
const GROUPSET_EVENT = "NAN901";

// ---------- auth (Auth.js via server actions) ----------

// Signs the user in with the Credentials provider. Sets the Auth.js session
// cookie server-side; returns { ok } or { error }.
export async function loginAction({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<{ ok?: true; error?: string }> {
  try {
    await signIn("credentials", { email, password, redirect: false });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password" };
    throw error;
  }
}

export async function logoutAction(): Promise<{ ok: true }> {
  await signOut({ redirect: false });
  return { ok: true };
}

// ---------- account ----------

export async function checkEmail(email: string): Promise<{ exists: boolean }> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email ?? "", mode: "insensitive" }, user_type: "C" },
    select: { user_id: true },
  });
  return { exists: !!user };
}

export async function registerUser(body: RegisterBody): Promise<Mutation<CompetitorDTO>> {
  const { email, password, re_password } = body ?? {};
  if (!email || !password) return { error: { detail: "Email and password are required." } };
  if (password !== re_password) return { error: { re_password: "Passwords do not match" } };

  const existing = await prisma.user.findUnique({ where: { email }, select: { user_id: true } });
  if (existing) return { error: { email: "A user with this email already exists." } };

  const user = await prisma.user.create({
    data: {
      email,
      password: hashPassword(password),
      user_type: "C",
      is_active: true,
      first_name: body.first_name ?? "",
      last_name: body.last_name ?? "",
      gender: body.gender || null,
      school_id: body.school || null,
      student_type: body.student_type || null,
      first_comp: body.first_comp ? Number(body.first_comp) : null,
      skill_level: body.skill_level || null,
      grad_date: body.grad_date ? new Date(body.grad_date) : null,
    },
    include: { school: true },
  });
  return { data: shapeCompetitor(user, []) };
}

function loadFullUser(userId: string) {
  return prisma.user.findUnique({
    where: { user_id: userId },
    include: { school: true, registration: { include: { event: true } } },
  });
}

export async function getMe(): Promise<CompetitorDTO | null> {
  const current = await getCurrentUser();
  if (!current) return null;
  const user = await loadFullUser(current.user_id);
  if (!user) return null;
  return shapeCompetitor(user, user.registration);
}

export async function updateMe(body: UpdateMeBody): Promise<Mutation<CompetitorDTO>> {
  const current = await getCurrentUser();
  if (!current) return { error: { detail: "Not authenticated." } };
  const data: Prisma.UserUncheckedUpdateInput = {};
  if (body.first_name !== undefined) data.first_name = body.first_name;
  if (body.last_name !== undefined) data.last_name = body.last_name;
  if (body.gender !== undefined) data.gender = body.gender;
  if (body.student_type !== undefined) data.student_type = body.student_type;
  if (body.skill_level !== undefined) data.skill_level = body.skill_level;
  if (body.first_comp !== undefined) data.first_comp = body.first_comp ? Number(body.first_comp) : null;
  if (body.school !== undefined) data.school_id = body.school;
  if (body.grad_date !== undefined) data.grad_date = body.grad_date ? new Date(body.grad_date) : null;

  await prisma.user.update({ where: { user_id: current.user_id }, data });
  const user = await loadFullUser(current.user_id);
  if (!user) return { error: { detail: "User not found." } };
  return { data: shapeCompetitor(user, user.registration) };
}

export async function deleteMe(): Promise<Mutation<{ detail: string }>> {
  const current = await getCurrentUser();
  if (!current) return { error: { detail: "Not authenticated." } };
  await prisma.user.delete({ where: { user_id: current.user_id } });
  return { data: { detail: "deleted" } };
}

export async function activate({ uid }: { uid?: string; token?: string }): Promise<Mutation<{ detail: string }>> {
  if (uid) {
    const u = await prisma.user.findUnique({ where: { user_id: uid }, select: { user_id: true } });
    if (!u) return { error: { detail: "Invalid activation link." } };
  }
  return { data: { detail: "Account active." } };
}

// ---------- competitor ----------

export async function getCompetitorEvents(): Promise<EventDTO[]> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return [];
  const events = await prisma.event.findMany({
    where: { event_level: user.skill_level, gender_category: user.gender },
  });
  return events.map(shapeEvent);
}

export async function getRegistrations(): Promise<RegistrationDTO[]> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return [];
  const settings = await loadSettings();
  if (!settings) return [];
  const regs = await prisma.registration.findMany({
    where: { competitor_id: user.user_id, comp_year: settings.reg_year },
    include: { event: true },
  });
  return regs.map(shapeRegistration);
}

export async function createRegistrations(items: RegistrationItem[]): Promise<Mutation<RegistrationDTO[]>> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return { error: { detail: "Not a competitor." } };
  const settings = await loadSettings();
  if (!settings) return { error: { event: "Competition settings have not been set" } };
  if (!regActive(settings)) return { error: { detail: "Registration is not active" } };
  if (!Array.isArray(items) || items.length === 0) return { error: { event: "No data" } };

  const codes = items.map((i) => i.event_code);
  if (new Set(codes).size !== codes.length) return { error: { event: "Duplicate events are not allowed." } };

  const year = settings.reg_year;
  const toCreate: Prisma.RegistrationCreateManyInput[] = [];
  for (const item of items) {
    const event = await prisma.event.findUnique({ where: { event_code: item.event_code } });
    if (!event) return { error: { event: `Event with id ${item.event_code} does not exist.` } };
    if (event.gender_category !== user.gender) return { error: { event: "Competitor signed up for wrong gender category" } };
    if (event.event_level !== user.skill_level) return { error: { event: "Competitor signed up for wrong level" } };
    const dupe = await prisma.registration.findFirst({
      where: { competitor_id: user.user_id, event_code: event.event_code, comp_year: year },
      select: { id: true },
    });
    if (dupe) return { error: { event: "You are already registered for this event." } };
    toCreate.push({ competitor_id: user.user_id, event_code: event.event_code, comp_year: year, nandu_str: item.nandu_str ?? "" });
  }

  await prisma.$transaction([
    prisma.registration.createMany({ data: toCreate }),
    prisma.user.update({ where: { user_id: user.user_id }, data: { is_competing: true } }),
  ]);

  const regs = await prisma.registration.findMany({
    where: { competitor_id: user.user_id, comp_year: year, event_code: { in: codes } },
    include: { event: true },
  });
  return { data: regs.map(shapeRegistration) };
}

export async function getMyGroupset(): Promise<GroupsetDTO[]> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return [];
  const settings = await loadSettings();
  if (!settings) return [];
  const groupsets = await prisma.groupset.findMany({
    where: { comp_year: settings.reg_year, members: { some: { member_id: user.user_id } } },
    include: { school: true, members: { include: { member: true } } },
  });
  return groupsets.map(shapeGroupset);
}

export async function createGroupset(body: { team_name: string }): Promise<Mutation<GroupsetDTO>> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return { error: { detail: "Not a competitor." } };
  const settings = await loadSettings();
  if (!settings) return { error: { detail: "No settings have been created yet." } };
  if (!regActive(settings)) return { error: { detail: "Registration is not active" } };
  const year = settings.reg_year;

  const alreadyIn = await prisma.groupsetMember.findFirst({
    where: { member_id: user.user_id, groupset: { comp_year: year } }, select: { id: true },
  });
  if (alreadyIn) return { error: { groupset: "You are already in a groupset" } };

  const nameTaken = await prisma.groupset.findFirst({ where: { team_name: body.team_name, comp_year: year }, select: { groupset_id: true } });
  if (nameTaken) return { error: { groupset: "A groupset with this name already exists" } };
  if (!user.school_id) return { error: { groupset: "You must belong to a school to create a groupset" } };

  const groupset = await prisma.groupset.create({
    data: {
      team_name: body.team_name,
      school_id: user.school_id,
      comp_year: year,
      members: { create: [{ member_id: user.user_id, leader: true }] },
    },
    include: { school: true, members: { include: { member: true } } },
  });
  return { data: shapeGroupset(groupset) };
}

export async function getJoinableGroupsets(): Promise<GroupsetDTO[]> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return [];
  const settings = await loadSettings();
  if (!settings) return [];
  if (!user.school_id) return [];
  const groupsets = await prisma.groupset.findMany({
    where: { school_id: user.school_id, comp_year: settings.reg_year },
    include: { school: true, members: { include: { member: true } } },
  });
  return groupsets.map(shapeGroupset);
}

export async function joinGroupset(body: { groupset: string }): Promise<Mutation<GroupsetDTO>> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return { error: { detail: "Not a competitor." } };
  const settings = await loadSettings();
  if (!settings) return { error: { detail: "No settings have been created yet." } };
  if (!regActive(settings)) return { error: { detail: "Registration is not active" } };
  const year = settings.reg_year;

  const groupset = await prisma.groupset.findUnique({ where: { groupset_id: body.groupset }, include: { members: true } });
  if (!groupset) return { error: { groupset: "Groupset does not exist" } };
  if (groupset.comp_year !== year) return { error: { groupset: "Groupset is not in current registration year" } };
  if (groupset.school_id !== user.school_id) return { error: { groupset: "You must sign up for a groupset from your school" } };
  if (groupset.members.some((m) => m.member_id === user.user_id)) return { error: { groupset: "You are already registered with this groupset" } };
  const alreadyIn = await prisma.groupsetMember.findFirst({ where: { member_id: user.user_id, groupset: { comp_year: year } }, select: { id: true } });
  if (alreadyIn) return { error: { groupset: "You are already in a groupset" } };
  if (groupset.members.length >= 6) return { error: { groupset: "Groupset is full" } };

  await prisma.groupsetMember.create({ data: { groupset_id: groupset.groupset_id, member_id: user.user_id, leader: false } });
  const full = await prisma.groupset.findUnique({ where: { groupset_id: groupset.groupset_id }, include: { school: true, members: { include: { member: true } } } });
  if (!full) return { error: { groupset: "Groupset does not exist" } };
  return { data: shapeGroupset(full) };
}

// ---------- organizer: settings / blog / events ----------

type OrganizerGate = { user: User; error?: undefined } | { user?: undefined; error: FieldErrors };

async function requireOrganizer(): Promise<OrganizerGate> {
  const user = await getCurrentUser();
  if (!user) return { error: { detail: "Not authenticated." } };
  if (!isOrganizer(user)) return { error: { detail: "You do not have permission." } };
  return { user };
}

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

export async function getOrganizerBlogPosts(): Promise<BlogDTO[]> {
  const posts = await prisma.blog.findMany({ orderBy: { date_created: "desc" } });
  return posts.map(shapeBlog);
}

export async function getBlogPostById(blogId: string): Promise<BlogDTO | null> {
  if (!blogId) return null;
  const post = await prisma.blog.findUnique({ where: { blog_id: blogId } });
  return post ? shapeBlog(post) : null;
}

export async function createBlogPost(body: BlogBody): Promise<Mutation<BlogDTO>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  const post = await prisma.blog.create({
    data: {
      author: body.author ?? "",
      category: body.category ?? "",
      title: body.title ?? "",
      blog_content: body.blog_content ?? "",
    },
  });
  revalidateTag("blog");
  return { data: shapeBlog(post) };
}

export async function updateBlogPost(blogId: string, body: BlogBody): Promise<Mutation<BlogDTO>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  const data: Prisma.BlogUpdateInput = {};
  if (body.author !== undefined) data.author = body.author;
  if (body.category !== undefined) data.category = body.category;
  if (body.title !== undefined) data.title = body.title;
  if (body.blog_content !== undefined) data.blog_content = body.blog_content;
  const post = await prisma.blog.update({ where: { blog_id: blogId }, data });
  revalidateTag("blog");
  revalidateTag(`blog-${blogId}`);
  return { data: shapeBlog(post) };
}

export async function deleteBlogPost(blogId: string): Promise<Mutation<{ detail: string }>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  await prisma.blog.delete({ where: { blog_id: blogId } });
  revalidateTag("blog");
  revalidateTag(`blog-${blogId}`);
  return { data: { detail: "deleted" } };
}

export async function getOrganizerEvents(): Promise<EventDTO[]> {
  const { error } = await requireOrganizer();
  if (error) return [];
  const events = await prisma.event.findMany();
  return events.map(shapeEvent);
}

// ---------- organizer: registrations ----------

function loadOrganizerUser(userId: string, year: number) {
  return prisma.user.findUnique({
    where: { user_id: userId },
    include: { school: true, registration: { where: { comp_year: year }, include: { event: true } } },
  });
}

export async function getOrganizerRegistrations(filters: OrganizerRegFilters = {}): Promise<OrganizerRegistrationDTO[]> {
  const { error } = await requireOrganizer();
  if (error) return [];
  const settings = await loadSettings();
  if (!settings) return [];
  const year = settings.reg_year;

  const where: Prisma.UserWhereInput = { registration: { some: { comp_year: year } } };
  if (filters.has_paid !== undefined) where.has_paid = filters.has_paid;
  if (filters.proof_of_reg !== undefined) where.proof_of_reg = filters.proof_of_reg;
  if (filters.is_competing !== undefined) where.is_competing = filters.is_competing;
  if (filters.school) where.school_id = filters.school;

  const users = await prisma.user.findMany({
    where,
    include: { school: true, registration: { where: { comp_year: year }, include: { event: true } } },
  });
  return users.map(shapeOrganizerRegistration);
}

export async function getOrganizerRegistration(uuid: string): Promise<OrganizerRegistrationDTO | null> {
  const { error } = await requireOrganizer();
  if (error) return null;
  const settings = await loadSettings();
  if (!settings) return null;
  const target = await loadOrganizerUser(uuid, settings.reg_year);
  return target ? shapeOrganizerRegistration(target) : null;
}

export async function updateOrganizerRegistration(
  uuid: string,
  body: UpdateOrganizerRegBody
): Promise<Mutation<OrganizerRegistrationDTO>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  const settings = await loadSettings();
  if (!settings) return { error: { detail: "No settings have been created yet." } };
  const year = settings.reg_year;

  const newReg = body.registration_input;
  if (Array.isArray(newReg)) {
    const events = newReg.map((r) => r.event);
    if (new Set(events).size !== events.length) return { error: { detail: "No duplicate events" } };

    const old = await prisma.registration.findMany({ where: { competitor_id: uuid, comp_year: year } });
    const oldEvents = new Set(old.map((r) => r.event_code));

    const toDelete = [...oldEvents].filter((e) => !events.includes(e));
    const toAdd = newReg.filter((r) => !oldEvents.has(r.event));
    const toUpdate = newReg.filter((r) => oldEvents.has(r.event) && r.nandu_str !== "");

    const ops: Prisma.PrismaPromise<unknown>[] = [];
    if (toDelete.length) ops.push(prisma.registration.deleteMany({ where: { competitor_id: uuid, comp_year: year, event_code: { in: toDelete } } }));
    if (toAdd.length) ops.push(prisma.registration.createMany({ data: toAdd.map((r) => ({ competitor_id: uuid, event_code: r.event, nandu_str: r.nandu_str ?? "", comp_year: year })) }));
    for (const r of toUpdate) ops.push(prisma.registration.updateMany({ where: { competitor_id: uuid, comp_year: year, event_code: r.event }, data: { nandu_str: r.nandu_str } }));
    ops.push(prisma.user.update({ where: { user_id: uuid }, data: { is_competing: true } }));
    await prisma.$transaction(ops);
  }

  const flags: Prisma.UserUpdateInput = {};
  if (body.has_paid !== undefined) flags.has_paid = body.has_paid;
  if (body.proof_of_reg !== undefined) flags.proof_of_reg = body.proof_of_reg;
  if (body.is_competing !== undefined) flags.is_competing = body.is_competing;
  if (Object.keys(flags).length) await prisma.user.update({ where: { user_id: uuid }, data: flags });

  const target = await loadOrganizerUser(uuid, year);
  if (!target) return { error: { detail: "User not found." } };
  return { data: shapeOrganizerRegistration(target) };
}

export async function findUserByEmail(email: string): Promise<OrganizerRegistrationDTO | null> {
  const { error } = await requireOrganizer();
  if (error) return null;
  const settings = await loadSettings();
  const year = settings?.reg_year;
  const target = await prisma.user.findFirst({
    where: { email: { equals: email ?? "", mode: "insensitive" } },
    include: {
      school: true,
      registration: year != null ? { where: { comp_year: year }, include: { event: true } } : { include: { event: true } },
    },
  });
  return target ? shapeOrganizerRegistration(target) : null;
}

// ---------- organizer: groupsets ----------

export async function getOrganizerGroupsets(): Promise<OrganizerGroupsetDTO[]> {
  const { error } = await requireOrganizer();
  if (error) return [];
  const settings = await loadSettings();
  if (!settings) return [];
  const groupsets = await prisma.groupset.findMany({ where: { comp_year: settings.reg_year }, include: { school: true, members: { include: { member: true } } } });
  return groupsets.map(shapeOrganizerGroupset);
}

export async function getOrganizerGroupset(uuid: string): Promise<OrganizerGroupsetDTO | null> {
  const { error } = await requireOrganizer();
  if (error) return null;
  const gs = await prisma.groupset.findUnique({ where: { groupset_id: uuid }, include: { school: true, members: { include: { member: true } } } });
  return gs ? shapeOrganizerGroupset(gs) : null;
}

export async function createOrganizerGroupset(body: CreateOrganizerGroupsetBody): Promise<Mutation<OrganizerGroupsetDTO>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  const settings = await loadSettings();
  if (!settings) return { error: { detail: "No settings have been created yet." } };
  const year = settings.reg_year;
  const members = body.members ?? [];

  if (new Set(members).size !== members.length) return { error: { groupset: "Duplicate members" } };
  if (members.length > 6) return { error: { groupset: "Number of members cannot exceed 6" } };

  const nameTaken = await prisma.groupset.findFirst({ where: { team_name: body.team_name, comp_year: year }, select: { groupset_id: true } });
  if (nameTaken) return { error: { groupset: "A groupset with this name already exists" } };

  for (const memberId of members) {
    const inGroupset = await prisma.groupsetMember.findFirst({ where: { member_id: memberId, groupset: { comp_year: year } }, select: { id: true } });
    if (inGroupset) return { error: { groupset: "Member is already in a groupset" } };
    const member = await prisma.user.findUnique({ where: { user_id: memberId }, select: { school_id: true } });
    if (!member || member.school_id !== body.school) return { error: { groupset: "Members must be from same school as groupset" } };
    const registered = await prisma.registration.findFirst({ where: { competitor_id: memberId, event_code: GROUPSET_EVENT, comp_year: year }, select: { id: true } });
    if (!registered) return { error: { groupset: "Member did not register for groupset" } };
  }

  const groupset = await prisma.groupset.create({
    data: {
      team_name: body.team_name,
      school_id: body.school,
      comp_year: year,
      members: { create: members.map((id) => ({ member_id: id, leader: id === body.leader })) },
    },
    include: { school: true, members: { include: { member: true } } },
  });
  return { data: shapeOrganizerGroupset(groupset) };
}

export async function updateOrganizerGroupset(
  uuid: string,
  body: UpdateOrganizerGroupsetBody
): Promise<Mutation<OrganizerGroupsetDTO>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  const gs = await prisma.groupset.findUnique({ where: { groupset_id: uuid }, include: { members: true } });
  if (!gs) return { error: { detail: "Not found." } };

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  const data: Prisma.GroupsetUncheckedUpdateInput = {};
  if (body.team_name !== undefined) data.team_name = body.team_name;

  let oldMemberIds = gs.members.map((m) => m.member_id);
  if (body.school !== undefined && body.school !== gs.school_id) {
    data.school_id = body.school;
    ops.push(prisma.groupsetMember.deleteMany({ where: { groupset_id: uuid } }));
    oldMemberIds = [];
  }

  if (Array.isArray(body.members)) {
    const newIds = body.members;
    const toDelete = oldMemberIds.filter((id) => !newIds.includes(id));
    const toAdd = newIds.filter((id) => !oldMemberIds.includes(id));
    if (toDelete.length) ops.push(prisma.groupsetMember.deleteMany({ where: { groupset_id: uuid, member_id: { in: toDelete } } }));
    for (const id of toAdd) {
      ops.push(prisma.groupsetMember.deleteMany({ where: { member_id: id, groupset: { comp_year: gs.comp_year } } }));
      ops.push(prisma.groupsetMember.create({ data: { groupset_id: uuid, member_id: id, leader: id === body.leader } }));
    }
    if (body.leader !== undefined) {
      ops.push(prisma.groupsetMember.updateMany({ where: { groupset_id: uuid }, data: { leader: false } }));
      ops.push(prisma.groupsetMember.updateMany({ where: { groupset_id: uuid, member_id: body.leader }, data: { leader: true } }));
    }
  }

  if (Object.keys(data).length) ops.push(prisma.groupset.update({ where: { groupset_id: uuid }, data }));
  if (ops.length) await prisma.$transaction(ops);

  const updated = await prisma.groupset.findUnique({ where: { groupset_id: uuid }, include: { school: true, members: { include: { member: true } } } });
  if (!updated) return { error: { detail: "Not found." } };
  return { data: shapeOrganizerGroupset(updated) };
}

export async function deleteOrganizerGroupset(uuid: string): Promise<Mutation<{ detail: string }>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  await prisma.groupset.delete({ where: { groupset_id: uuid } });
  return { data: { detail: "deleted" } };
}

// ---------- event order ----------

// Resolve an Order down to each ring's EventOrder + its competitors (matches the
// nested OrderSerializer representation). `satisfies` keeps the literal include
// type so Prisma infers the related payload instead of widening it away.
const EVENT_ORDER_INCLUDE = {
  competitor_orders: { include: { competitor: true } },
} satisfies Prisma.EventOrderInclude;

const ORDER_INCLUDE = {
  ring1: { include: { eventorder: { include: EVENT_ORDER_INCLUDE } } },
  ring2: { include: { eventorder: { include: EVENT_ORDER_INCLUDE } } },
  ring3: { include: { eventorder: { include: EVENT_ORDER_INCLUDE } } },
} satisfies Prisma.OrderInclude;

// EventOrderSerializer._sync_competitors: upsert each provided competitor's
// CompetitorOrder, then drop any that are no longer listed. (CompetitorOrder has
// no DB unique constraint, matching Django, so this emulates update_or_create.)
async function syncCompetitors(
  tx: Prisma.TransactionClient,
  eventOrderId: string,
  comps: EventOrderCompetitorInput[],
): Promise<void> {
  const keep: string[] = [];
  for (const item of comps) {
    if (!item.id) continue;
    const existing = await tx.competitorOrder.findFirst({
      where: { event_order_id: eventOrderId, competitor_id: item.id },
      select: { id: true },
    });
    if (existing) {
      await tx.competitorOrder.update({ where: { id: existing.id }, data: { order: item.order ?? 0 } });
    } else {
      await tx.competitorOrder.create({
        data: { event_order_id: eventOrderId, competitor_id: item.id, order: item.order ?? 0 },
      });
    }
    keep.push(item.id);
  }
  await tx.competitorOrder.deleteMany({
    where: { event_order_id: eventOrderId, competitor_id: { notIn: keep } },
  });
}

// EventOrderRelatedField.to_internal_value: an item with an `id` updates that
// EventOrder in place; an item without one is created fresh (new uuid, comp_year
// from settings). Returns the persisted EventOrder id either way.
async function persistEventOrder(
  tx: Prisma.TransactionClient,
  item: EventOrderInput,
  year: number,
): Promise<string> {
  const comps = item.competitor_list;

  if (item.id) {
    const existing = await tx.eventOrder.findUnique({ where: { id: item.id }, select: { id: true } });
    if (existing) {
      const data: Prisma.EventOrderUncheckedUpdateInput = {};
      if (item.event_id !== undefined) data.event_id = item.event_id;
      if (item.name !== undefined) data.name = item.name;
      if (item.break_length !== undefined) data.break_length = item.break_length;
      if (item.order !== undefined) data.order = item.order;
      if (Object.keys(data).length) await tx.eventOrder.update({ where: { id: item.id }, data });
      if (comps !== undefined) await syncCompetitors(tx, item.id, comps);
      return item.id;
    }
    // id supplied but the row is gone — recreate it with the same id so the
    // client-provided reference stays stable.
    await tx.eventOrder.create({
      data: {
        id: item.id,
        comp_year: year,
        event_id: item.event_id ?? null,
        break_length: item.break_length ?? 0,
        name: item.name ?? null,
        order: item.order ?? 0,
      },
    });
    if (comps !== undefined) await syncCompetitors(tx, item.id, comps);
    return item.id;
  }

  const created = await tx.eventOrder.create({
    data: {
      id: crypto.randomUUID(),
      comp_year: year,
      event_id: item.event_id ?? null,
      break_length: item.break_length ?? 0,
      name: item.name ?? null,
      order: item.order ?? 0,
    },
    select: { id: true },
  });
  await syncCompetitors(tx, created.id, comps ?? []);
  return created.id;
}

// Replace an Order's ring membership with `ids` (Django M2M `.set()`): clear the
// join table for this year, then re-link in the given order.
async function replaceRing(
  tx: Prisma.TransactionClient,
  ring: RingKey,
  year: number,
  ids: string[],
): Promise<void> {
  const data = ids.map((eid) => ({ order_id: year, eventorder_id: eid }));
  if (ring === "ring1") {
    await tx.orderRing1.deleteMany({ where: { order_id: year } });
    if (ids.length) await tx.orderRing1.createMany({ data });
  } else if (ring === "ring2") {
    await tx.orderRing2.deleteMany({ where: { order_id: year } });
    if (ids.length) await tx.orderRing2.createMany({ data });
  } else {
    await tx.orderRing3.deleteMany({ where: { order_id: year } });
    if (ids.length) await tx.orderRing3.createMany({ data });
  }
}

// OrganizerOrderView retrieve: the saved order for the current comp_year.
export async function getOrganizerOrder(): Promise<OrderDTO | null> {
  const { error } = await requireOrganizer();
  if (error) return null;
  const settings = await loadSettings();
  if (!settings) return null;
  const order = await prisma.order.findUnique({
    where: { comp_year: settings.reg_year },
    include: ORDER_INCLUDE,
  });
  return order ? shapeOrder(order) : null;
}

// OrganizerOrderView create/update: upsert the single Order for the current year
// (comp_year is its primary key) and rewrite whichever rings were provided.
export async function saveOrder(body: OrderBody): Promise<Mutation<OrderDTO>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  const settings = await loadSettings();
  if (!settings) return { error: { detail: "No settings have been created yet." } };
  const year = settings.reg_year;
  const rings: RingKey[] = ["ring1", "ring2", "ring3"];

  await prisma.$transaction(async (tx) => {
    await tx.order.upsert({
      where: { comp_year: year },
      create: { comp_year: year, public: body.public ?? false },
      update: body.public !== undefined ? { public: body.public } : {},
    });

    for (const ring of rings) {
      const items = body[ring];
      if (items === undefined) continue; // ring omitted → leave it untouched
      const ids: string[] = [];
      for (const item of items) ids.push(await persistEventOrder(tx, item, year));
      await replaceRing(tx, ring, year, ids);
    }
  });

  const saved = await prisma.order.findUnique({ where: { comp_year: year }, include: ORDER_INCLUDE });
  if (!saved) return { error: { detail: "Failed to save order." } };
  return { data: shapeOrder(saved) };
}

// CompetitorOrderView: the published (public) order for the current year, if any.
export async function getPublicOrder(): Promise<OrderDTO | null> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return null;
  const settings = await loadSettings();
  if (!settings) return null;
  const order = await prisma.order.findFirst({
    where: { comp_year: settings.reg_year, public: true },
    include: ORDER_INCLUDE,
  });
  return order ? shapeOrder(order) : null;
}
