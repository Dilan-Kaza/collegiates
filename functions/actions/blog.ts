"use server";

// Blog server actions: public reads and organizer-gated writes.

import { unstable_cache, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { shapeBlog } from "@/lib/api";
import type { BlogDTO } from "@/lib/api";
import { READ_CACHE_TTL, requireOrganizer, reBlog } from "./shared";
import type { Mutation, BlogBody } from "./shared";

export async function getOrganizerBlogPosts(): Promise<BlogDTO[]> {
  const posts = await unstable_cache(
    async (): Promise<BlogDTO[]> => {
      const rows = await prisma.blog.findMany({ orderBy: { date_created: "desc" } });
      return rows.map(shapeBlog);
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
