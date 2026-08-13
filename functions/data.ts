import "server-only";
import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { shapeSettings, shapeBlog, shapeBlogListItem, shapeOrder, ORDER_INCLUDE } from "@/lib/api";
import type { SettingsDTO, BlogDTO, OrderDTO, LiveScoresDTO } from "@/lib/api";
import { loadSettings } from "@/lib/settings";
import { readSheetTabs } from "@/lib/sheets";
import { parseScoringTab } from "@/lib/liveScores";
import { RING_KEYS, RING_LABEL, scoringTabTitle } from "@/lib/scoringLayout";

/**
 * Cached public-data readers for Server Components.
 *
 * @remarks
 * These go straight to Prisma — no HTTP hop — through Next's Data Cache, tagged
 * so a write invalidates exactly what it touched. Call them from a `page.tsx`
 * and pass the result down as props.
 *
 * The module is `server-only`, so it can never be pulled into a bundle. Client
 * components that need to *refill* one of these values after a mutation call the
 * matching `getShared*` action instead, which shares the same cache entry.
 *
 * The Data Cache serializes through JSON, which flattens `Date` to a string, so
 * readers whose DTOs carry dates rehydrate them on the way out.
 *
 * @packageDocumentation
 */

/**
 * Every college as `{ [college_name]: college_id }`, the shape the pickers take.
 */
export const getColleges = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const rows = await prisma.college.findMany({ orderBy: { college_name: "asc" } });
    return Object.fromEntries(rows.map((c) => [c.college_name, c.college_id] as const));
  },
  ["colleges"],
  { tags: ["colleges"], revalidate: 3600 }
);

/**
 * Every School account as host options for the admin console.
 *
 * @returns `{ [label]: email }`. Keyed by email because `createSettings` and
 * `saveSettings` both resolve a host that way; the label prefixes the college
 * when the account has one.
 */
export const getSchoolAccounts = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const rows = await prisma.user.findMany({
      where: { user_type: "School" },
      select: { email: true, college_profile: { select: { college: { select: { college_name: true } } } } },
      orderBy: { email: "asc" },
    });
    return Object.fromEntries(
      rows.map((u) => {
        const college = u.college_profile?.college?.college_name;
        const label = college ? `${college} · ${u.email}` : u.email;
        return [label, u.email] as const;
      })
    );
  },
  ["school-accounts"],
  { tags: ["school-accounts"], revalidate: 3600 }
);

/**
 * The competition settings as a DTO.
 *
 * @remarks
 * `loadSettings` is already Data-Cache backed with its dates rehydrated, so this
 * is a pure shaping step — it adds no second cache entry.
 */
export async function getSettings(): Promise<SettingsDTO | null> {
  return shapeSettings(await loadSettings());
}

/** The public blog list, newest first, as excerpts. */
export const getBlogPosts = unstable_cache(
  async (): Promise<BlogDTO[]> => {
    const rows = await prisma.blog.findMany({ orderBy: { date_created: "desc" } });
    return rows.map(shapeBlogListItem);
  },
  ["blog-list"],
  { tags: ["blog"], revalidate: 3600 }
);

/**
 * The cache tag for one settings row's event order.
 *
 * @remarks
 * Exported so {@link getOrderForSettings} and `saveOrder`'s invalidation cannot
 * drift apart — a mismatch would serve a stale schedule with no obvious cause.
 */
export const orderTag = (settingsId: string): string => `order-${settingsId}`;

/**
 * The saved event order for one competition year.
 *
 * @remarks
 * Pure and settings-keyed: **gating is the caller's job**. Both the organizer
 * and the public read go through here, and only the public one checks
 * `order_public`.
 *
 * The order hangs off the settings row, and a null `order_updated_at` means it
 * has never been saved.
 *
 * @param settingsId - The competition year's settings row.
 * @returns The order, or `null` when none has been saved.
 */
export async function getOrderForSettings(settingsId: string): Promise<OrderDTO | null> {
  const order = await unstable_cache(
    async (): Promise<OrderDTO | null> => {
      const s = await prisma.settings.findUnique({ where: { id: settingsId }, include: ORDER_INCLUDE });
      return s?.order_updated_at ? shapeOrder(s) : null;
    },
    ["order", settingsId],
    { tags: ["order", orderTag(settingsId)], revalidate: 3600 }
  )();
  // Restore the Date the cache serialized to a string, matching OrderDTO.
  if (order) order.updated_at = new Date(order.updated_at);
  return order;
}

/** One blog post with its complete body, for the reader page. */
export async function getBlogPost(blogId: string): Promise<BlogDTO | null> {
  if (!blogId) return null;
  const post = await unstable_cache(
    async (): Promise<BlogDTO | null> => {
      const b = await prisma.blog.findUnique({ where: { blog_id: blogId } });
      return b ? shapeBlog(b) : null;
    },
    ["blog-post", blogId],
    { tags: ["blog", `blog-${blogId}`], revalidate: 3600 }
  )();
  if (post?.date_created) post.date_created = new Date(post.date_created);
  return post;
}

/**
 * How long a live-scores read is cached, in seconds.
 *
 * @remarks
 * Short, because the page is watched live, but non-zero because the cache is
 * shared by every viewer at once — the service account's 60-reads-a-minute quota
 * must not scale with the size of the audience.
 */
export const LIVE_SCORES_TTL = 20;

/**
 * Reads a competition's live scores out of its Google Sheet.
 *
 * @remarks
 * Ungated and undredacted: {@link "functions/actions/scoring"} decides who may
 * call it and strips judge detail afterwards. Rings whose tab does not exist, or
 * has no blocks in it yet, are left out rather than shown empty — so a two-ring
 * competition is not an error.
 *
 * @param spreadsheetId - The competition's spreadsheet.
 * @param year - The competition year, which stamps the tab titles.
 * @returns Every ring that had scores, with `fetched_at` set.
 */
export async function getLiveScoresForSheet(
  spreadsheetId: string,
  year: number | null,
): Promise<LiveScoresDTO> {
  const scores = await unstable_cache(
    async (): Promise<LiveScoresDTO> => {
      // The tab names this year's export would have written. readSheetTabs skips the
      // ones that do not exist, so a two-ring competition is not an error.
      const titles = RING_KEYS.map((ring) => scoringTabTitle(ring, year));
      const tabs = await readSheetTabs(spreadsheetId, titles);
      const rings = RING_KEYS
        .map((ring, i) => parseScoringTab(RING_LABEL[ring], tabs.get(titles[i]) ?? []))
        // A ring with no tab, or a tab the export has not put blocks into yet, is
        // left out rather than shown empty.
        .filter((ring) => ring.events.length > 0);
      return { rings, fetched_at: new Date(), detail: true };
    },
    ["live-scores", spreadsheetId, String(year)],
    { tags: ["live-scores"], revalidate: LIVE_SCORES_TTL }
  )();
  // Restore the Date the cache serialized to a string, as the order read does.
  return { ...scores, fetched_at: new Date(scores.fetched_at) };
}
