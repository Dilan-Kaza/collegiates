import "server-only";
import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { shapeSettings, shapeBlog } from "@/lib/api";
import type { SettingsDTO, BlogDTO } from "@/lib/api";
import { loadSettings } from "@/lib/settings";

// Cached, static async data-fetching functions for public data. These query
// Prisma directly (no HTTP round-trip) and use Next's Data Cache via
// unstable_cache — tagged so writes can invalidate them (revalidateTag).
// Call these from Server Components; pass the result as props to client
// components.

// { [college_name]: college_id }
export const getColleges = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const rows = await prisma.college.findMany({ orderBy: { college_name: "asc" } });
    return Object.fromEntries(rows.map((c) => [c.college_name, c.college_id] as const));
  },
  ["colleges"],
  { tags: ["colleges"], revalidate: 3600 }
);

const _getSettings = unstable_cache(
  async (): Promise<SettingsDTO | null> => {
    const s = await loadSettings();
    return s ? shapeSettings(s) : null;
  },
  ["settings"],
  { tags: ["settings"], revalidate: 3600 }
);

// Ensures date fields are Date objects regardless of cache serialization,
// so client consumers (which expect Dates) work uniformly.
export async function getSettings(): Promise<SettingsDTO | null> {
  const s = await _getSettings();
  if (!s) return null;
  return {
    ...s,
    early_reg_start: s.early_reg_start ? new Date(s.early_reg_start) : null,
    reg_start: new Date(s.reg_start),
    reg_end: new Date(s.reg_end),
    comp_date: s.comp_date ? new Date(s.comp_date) : null,
  };
}

export const getBlogPosts = unstable_cache(
  async (): Promise<BlogDTO[]> => {
    const rows = await prisma.blog.findMany({ orderBy: { date_created: "desc" } });
    return rows.map(shapeBlog);
  },
  ["blog-list"],
  { tags: ["blog"], revalidate: 3600 }
);

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
