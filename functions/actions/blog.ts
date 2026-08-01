"use server";

// Blog server actions: public reads and organizer-gated writes.

import { unstable_cache, updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { shapeBlog, shapeBlogListItem } from "@/lib/api";
import type { BlogDTO } from "@/lib/api";
import { READ_CACHE_TTL, organizerGate, reBlog } from "./shared";
import type { Mutation, BlogBody } from "./shared";

// The organizer console's post list. Blog content is public (see data.ts's
// getBlogPosts), but this is the management view, so it takes the same gate as
// the writes below rather than being callable by anyone.
export async function getOrganizerBlogPosts(): Promise<BlogDTO[]> {
  const { error } = await organizerGate();
  if (error) return [];
  const posts = await unstable_cache(
    async (): Promise<BlogDTO[]> => {
      const rows = await prisma.blog.findMany({ orderBy: { date_created: "desc" } });
      return rows.map(shapeBlogListItem);
    },
    ["organizer-blog-list"],
    { tags: ["blog"], revalidate: READ_CACHE_TTL },
  )();
  return posts.map(reBlog);
}

export async function getBlogPostById(blogId: string): Promise<BlogDTO | null> {
  if (!blogId) return null;
  const post = await unstable_cache(
    async (): Promise<BlogDTO | null> => {
      const b = await prisma.blog.findUnique({ where: { blog_id: blogId } });
      return b ? shapeBlog(b) : null;
    },
    ["blog-post-by-id", blogId],
    { tags: ["blog", `blog-${blogId}`], revalidate: READ_CACHE_TTL },
  )();
  return post ? reBlog(post) : null;
}

export async function createBlogPost(body: BlogBody): Promise<Mutation<BlogDTO>> {
  const { error } = await organizerGate();
  if (error) return { error };
  const post = await prisma.blog.create({
    data: {
      author: body.author ?? "",
      category: body.category ?? "",
      title: body.title ?? "",
      blog_content: body.blog_content ?? "",
    },
  });
  updateTag("blog");
  return { data: shapeBlog(post) };
}

export async function updateBlogPost(blogId: string, body: BlogBody): Promise<Mutation<BlogDTO>> {
  const { error } = await organizerGate();
  if (error) return { error };
  const data: Prisma.BlogUpdateInput = {};
  if (body.author !== undefined) data.author = body.author;
  if (body.category !== undefined) data.category = body.category;
  if (body.title !== undefined) data.title = body.title;
  if (body.blog_content !== undefined) data.blog_content = body.blog_content;
  const post = await prisma.blog.update({ where: { blog_id: blogId }, data });
  updateTag("blog");
  updateTag(`blog-${blogId}`);
  return { data: shapeBlog(post) };
}

export async function deleteBlogPost(blogId: string): Promise<Mutation<{ detail: string }>> {
  const { error } = await organizerGate();
  if (error) return { error };
  await prisma.blog.delete({ where: { blog_id: blogId } });
  updateTag("blog");
  updateTag(`blog-${blogId}`);
  return { data: { detail: "deleted" } };
}
