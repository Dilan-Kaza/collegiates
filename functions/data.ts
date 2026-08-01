import "server-only";
import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { shapeSettings, shapeBlog, shapeBlogListItem, shapeOrder, ORDER_INCLUDE } from "@/lib/api";
import type { SettingsDTO, BlogDTO, OrderDTO } from "@/lib/api";
import { loadSettings } from "@/lib/settings";

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

// The saved order for a competition year, via the Data Cache. Pure, year-keyed
// data — auth and public/organizer gating are the caller's responsibility.
export async function getOrderByYear(year: number): Promise<OrderDTO | null> {
  const order = await unstable_cache(
    async (): Promise<OrderDTO | null> => {
      const o = await prisma.order.findUnique({ where: { comp_year: year }, include: ORDER_INCLUDE });
      return o ? shapeOrder(o) : null;
    },
    ["order", String(year)],
    { tags: ["order", `order-${year}`], revalidate: 3600 }
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
