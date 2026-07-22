"use client";

import { Link } from "@/routerCompat";
import { useState } from "react";
import type { BlogDTO } from "@/lib/api";

// `posts` is resolved on the server and passed in (was fetched on mount). The
// parent server page re-fetches (via router.refresh) after a create.
export default function OrganizerBlogList({ posts = [] }: { posts?: BlogDTO[] }) {

    const [visible, setVisible] = useState(3);

    if (posts.length === 0) return (
        <div className="text-sm text-gray-400">No blog posts found.</div>
    );

    const sorted = [...posts].sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());

    return (
        <div className="flex flex-col gap-3">
            {sorted.slice(0, visible).map((post) => (
                <Link key={post.blog_id} to={`/organizer/blog/${post.blog_id}`} className="cg-list-row hover:bg-gray-50 transition-colors">
                    <div className="flex items-baseline gap-2">
                        <div className="font-medium text-dark">{post.title}</div>
                        {post.date_created && <div className="text-xs text-gray-400 shrink-0">{new Date(post.date_created).toLocaleDateString()}</div>}
                    </div>
                    {post.author && <div className="text-xs text-gray-400 mt-1">By {post.author}</div>}
                    {post.category && <div className="text-xs text-primary font-medium uppercase tracking-wide mt-1">{post.category}</div>}
                    {post.blog_content && <div className="text-sm text-gray-500 mt-2 line-clamp-2">{post.blog_content}</div>}
                </Link>
            ))}
            {visible < sorted.length && (
                <button
                    className="btn btn-ghost btn-sm self-center"
                    onClick={() => setVisible(v => v + 3)}
                >
                    Load More
                </button>
            )}
        </div>
    );
}
