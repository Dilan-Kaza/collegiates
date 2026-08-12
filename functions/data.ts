import "server-only";
import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { shapeSettings, shapeBlog, shapeBlogListItem, shapeOrder, ORDER_INCLUDE } from "@/lib/api";
import type { SettingsDTO, BlogDTO, OrderDTO, LiveScoresDTO } from "@/lib/api";
import { loadSettings } from "@/lib/settings";
import { readSheetTabs } from "@/lib/sheets";
import { parseScoringTab } from "@/lib/liveScores";
import { RING_KEYS, RING_LABEL, scoringTabTitle } from "@/lib/scoringLayout";

// Cached public-data fetchers: Prisma direct (no HTTP) through Next's Data Cache,
// tagged so writes invalidate them. Call from Server Components, pass as props.

// { [college_name]: college_id }
export const getColleges = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const rows = await prisma.college.findMany({ orderBy: { college_name: "asc" } });
    return Object.fromEntries(rows.map((c) => [c.college_name, c.college_id] as const));
  },
  ["colleges"],
  { tags: ["colleges"], revalidate: 3600 }
);

// { [label]: email } for every School account, as host options for the admin
// console. Keyed by email because createSettings resolves the host that way.
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

// The settings DTO for client components. loadSettings is already Data-Cache
// backed with rehydrated Dates, so this is a pure shape — no second entry.
export async function getSettings(): Promise<SettingsDTO | null> {
  return shapeSettings(await loadSettings());
}

export const getBlogPosts = unstable_cache(
  async (): Promise<BlogDTO[]> => {
    const rows = await prisma.blog.findMany({ orderBy: { date_created: "desc" } });
    return rows.map(shapeBlogListItem);
  },
  ["blog-list"],
  { tags: ["blog"], revalidate: 3600 }
);

// The cache tag for one settings row's order, so the read below and saveOrder's
// invalidation cannot drift apart.
export const orderTag = (settingsId: string): string => `order-${settingsId}`;

// The saved order for a competition year, via the Data Cache. Pure and settings-keyed — gating is
// the caller's job. The order lives on Settings; `order_updated_at` null means "never saved".
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

// The live scoring read, off the competition's Google Sheet. Cached short and shared by every
// viewer: the service account's 60-reads-a-minute quota must not scale with the audience.
export const LIVE_SCORES_TTL = 20; // seconds

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
