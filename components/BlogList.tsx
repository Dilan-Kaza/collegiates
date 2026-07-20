"use client";

import { Link } from "@/routerCompat";
import type { BlogDTO } from "@/lib/api";
// blog post sidebar list

interface BlogListProps {
  activeBlogId?: string;
  category?: string;
  posts?: BlogDTO[];
}

export default function BlogList({ activeBlogId, category, posts = [] }: BlogListProps) {

    if (posts.length === 0) return (
        <div className="text-sm text-gray-400">No blog posts found.</div>
    );

    const sorted = [...posts]
        .filter((post) => !category || post.category === category)
        .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());

    return (
        <div className="flex flex-col gap-2 bg-primary rounded-lg px-3 py-2">
            {sorted.map((post) => post.blog_id === activeBlogId ? (
                <div key={post.blog_id} className="flex flex-col">
                    <span className="text-yellow-400 underline">{post.title}</span>
                    {post.date_created && <span className="text-xs text-off-white/60">{new Date(post.date_created).toLocaleDateString()}</span>}
                </div>
            ) : (
                <Link key={post.blog_id} to={`/blog/${post.blog_id}`} className="link link-hover flex flex-col text-off-white">
                    <span>{post.title}</span>
                    {post.date_created && <span className="text-xs text-off-white/60">{new Date(post.date_created).toLocaleDateString()}</span>}
                </Link>
            ))}
        </div>
    );
}
