"use client";

import { MtHeader, OrganizerBlogList } from "@components";
import { setErrorMsg, setSuccessMsg } from "@slices";
import { createBlogPost } from "@functions/actions";
import { errorMessage, runAction } from "@functions/actionErrors";
import { cacheKeys, useCachedResource, fetchOrganizerBlogPosts } from "@functions";
import { clearSessionCache } from "@functions/sessionCache";
import { useState } from "react";
import { useNavigate } from "@/routerCompat";
import { useAppDispatch } from "@/store/hooks";
import type { BlogDTO } from "@/lib/api";

// `posts` arrives from the server for first paint, then follows its cache entry.
// A create drops that entry, and createBlogPost has already dropped the server's
// "blog" tag, so the refetch returns the new post — no local prepend to keep in
// sync, and no router.refresh() RSC round trip.
export default function BlogManager({ posts: initialPosts = [] }: { posts?: BlogDTO[] }) {

    const nav = useNavigate();
    const dispatch = useAppDispatch();
    const posts = useCachedResource(
        cacheKeys.organizerBlogPosts,
        fetchOrganizerBlogPosts,
        initialPosts,
    );
    const [title, setTitle] = useState("");
    const [blog_content, setBlogContent] = useState("");
    const [author, setAuthor] = useState("");
    const [category, setCategory] = useState("");
    const [loading, setLoading] = useState(false);

    const handlePost = async () => {
        if (!title.trim() || !blog_content.trim() || !category) return;
        setLoading(true);
        const fallback = "Failed to post blog";
        try {
            const { error } = await runAction(
                () => createBlogPost({ title, blog_content, author, category }),
                fallback,
            );
            if (error) {
                // createBlogPost reports missing content under `title` /
                // `blog_content`, so errorMessage has to look past `detail`.
                dispatch(setErrorMsg(errorMessage(error, fallback)));
                // The draft stays in the form — clearing it would lose the post.
                return;
            }
            setTitle("");
            setBlogContent("");
            setAuthor("");
            setCategory("");
            // Dropping the list entry is what adds the post to the view: the hook
            // above refills it from getOrganizerBlogPosts, whose "blog" tag
            // createBlogPost just invalidated. blogPosts is the public list, read
            // by other routes.
            clearSessionCache(cacheKeys.organizerBlogPosts);
            clearSessionCache(cacheKeys.blogPosts);
            dispatch(setSuccessMsg("Post published"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="hidden md:block"><MtHeader /></div>
            <div className="max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <button className="btn btn-primary btn-sm" onClick={() => nav("/organizer")}>← Back</button>
                    <div className="text-3xl text-secondary font-semibold">Blog Posts</div>
                </div>

                <div className="cg-card">
                    <div className="text-xl font-semibold text-primary border-b border-gray-200 pb-2">New Post</div>
                    <input
                        className="cg-input"
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <input
                        className="cg-input"
                        placeholder="Author"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                    />
                    <select
                        className="cg-input bg-off-white"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="" disabled>Select a category…</option>
                        <option value="News">News</option>
                        <option value="Multimedia">Multimedia</option>
                    </select>
                    <div className="flex flex-col gap-1">
                        <textarea
                            className="cg-input min-h-[8rem] resize-y"
                            placeholder="Content"
                            value={blog_content}
                            onChange={(e) => setBlogContent(e.target.value)}
                        />
                        <span className="text-xs text-gray-400">Use the format: link&quot;{`https://example.com`}&quot;</span>
                    </div>
                    <div className="flex justify-end">
                        <button
                            className="btn btn-primary"
                            onClick={handlePost}
                            disabled={loading || !title.trim() || !blog_content.trim() || !category}
                        >
                            {loading ? "Posting..." : "Post"}
                        </button>
                    </div>
                </div>

                <div className="cg-card">
                    <div className="text-xl font-semibold text-primary border-b border-gray-200 pb-2">Posts</div>
                    <OrganizerBlogList posts={posts} />
                </div>
            </div>
        </>
    );
}
