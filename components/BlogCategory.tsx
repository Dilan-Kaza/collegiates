"use client";

import { MtHeader, BlogList } from "@components";
import { useCachedResource, cacheKeys, fetchBlogPosts } from "@functions";
import type { BlogDTO } from "@/lib/api";

/** The news page filtered to one category. */
export default function BlogCategory({
    category,
    posts: initialPosts = [],
}: {
    /** The category to show, also used as the heading. */
    category: string;
    /**
     * Server-rendered posts for first paint. Bound to the shared `blogPosts`
     * cache entry, which an editor save drops — so a published edit appears
     * without a full reload.
     */
    posts?: BlogDTO[];
}) {
    // Server data for first paint, then the cache entry — the organizer's editor
    // drops this key on save, so a published edit shows without a full reload.
    const posts = useCachedResource(cacheKeys.blogPosts, fetchBlogPosts, initialPosts);

    return (
        <>
            <div className="hidden md:block"><MtHeader /></div>
            <div className="max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
                <div className="text-3xl text-secondary font-semibold">{category}</div>
                <div className="rounded-lg px-6 py-5 flex flex-col gap-4">
                    <BlogList category={category} posts={posts} />
                </div>
            </div>
        </>
    );
}
