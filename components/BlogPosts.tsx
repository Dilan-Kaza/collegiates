"use client";

import { Link } from "@/routerCompat";
import type { BlogDTO } from "@/lib/api";

/**
 * The home page's news teaser: the three most recent posts as cards.
 *
 * @remarks
 * Only the first card shows on mobile; the other two appear from the `sm`
 * breakpoint up.
 */
export default function BlogPosts({ posts = [] }: { posts?: BlogDTO[] }) {

    if (posts.length === 0) return (
        <div className="text-sm text-gray-400">No blog posts found.</div>
    );

    const sorted = [...posts].sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {sorted.slice(0, 3).map((post, i) => (
                <Link key={post.blog_id} to={`/blog/${post.blog_id}`} className={`bg-off-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2 h-48 overflow-hidden hover:border-primary transition-colors${i > 0 ? " hidden sm:flex" : ""}`}>
                    <div className="flex items-baseline gap-2">
                        <div className="font-medium text-dark">{post.title}</div>
                        {post.date_created && <div className="text-xs text-gray-400 shrink-0">{new Date(post.date_created).toLocaleDateString()}</div>}
                    </div>
                    {post.author && <div className="text-xs text-gray-400">By {post.author}</div>}
                    {post.category && <div className="text-xs text-primary font-medium uppercase tracking-wide">{post.category}</div>}
                    {post.blog_content && <div className="text-sm text-gray-500 mt-1 overflow-hidden">{post.blog_content.replace(/link"([^"]*)"/g, "$1")}</div>}
                </Link>
            ))}
        </div>
    );
}
