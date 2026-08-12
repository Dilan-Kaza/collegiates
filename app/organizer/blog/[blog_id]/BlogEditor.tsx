"use client";

import { MtHeader } from "@components";
import { cacheKeys } from "@functions";
import { clearSessionCache } from "@functions/sessionCache";
import { setErrorMsg, setSuccessMsg } from "@slices";
import { updateBlogPost } from "@functions/actions";
import { errorMessage, runAction } from "@functions/actionErrors";
import { Link } from "@/routerCompat";
import { useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import type { BlogDTO } from "@/lib/api";
// organizer blog post editor

// The post arrives from the server, which also gates to organizers, so the editor
// renders populated with no mount fetch and no empty-state flash.
export default function BlogEditor({
    blogId,
    post: initialPost,
}: {
    blogId: string;
    post: BlogDTO;
}) {

    const dispatch = useAppDispatch();

    const [post, setPost] = useState<BlogDTO>(initialPost);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<Record<string, string>>({
        title: initialPost.title,
        author: initialPost.author,
        category: initialPost.category,
        blog_content: initialPost.blog_content,
    });

    const handleSave = async () => {
        setLoading(true);
        const fallback = "Failed to save post";
        try {
            const { data, error } = await runAction(() => updateBlogPost(blogId, form), fallback);
            if (error || !data) {
                dispatch(setErrorMsg(errorMessage(error, fallback)));
                // Stay in edit mode so the unsaved draft isn't replaced by the
                // last-known-good post.
                return;
            }
            setPost(data);
            setEditing(false);
            // The saved post is now stale in the cache: drop its own entry and the
            // organizer/public list entries so the next read reflects the edit.
            clearSessionCache(cacheKeys.blogPost(blogId));
            clearSessionCache(cacheKeys.organizerBlogPosts);
            clearSessionCache(cacheKeys.blogPosts);
            dispatch(setSuccessMsg("Post saved"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="hidden md:block"><MtHeader /></div>
            <div className="max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <Link to="/organizer/blog" className="btn btn-primary btn-sm">← Back</Link>
                    <button className="btn btn-sm btn-secondary" onClick={() => setEditing(e => !e)}>
                        {editing ? "Cancel" : "Edit"}
                    </button>
                </div>

                <div className="bg-off-white rounded-2xl px-6 py-5 flex flex-col gap-4 min-h-[20rem]">
                    {editing ? (
                        <>
                            <input
                                className="cg-input text-2xl font-semibold"
                                value={form.title}
                                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Title"
                            />
                            <input
                                className="cg-input"
                                value={form.author}
                                onChange={(e) => setForm(f => ({ ...f, author: e.target.value }))}
                                placeholder="Author"
                            />
                            <select
                                className="cg-input bg-off-white"
                                value={form.category}
                                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                            >
                                <option value="News">News</option>
                                <option value="Multimedia">Multimedia</option>
                            </select>
                            <textarea
                                className="cg-input min-h-[12rem] resize-y"
                                value={form.blog_content}
                                onChange={(e) => setForm(f => ({ ...f, blog_content: e.target.value }))}
                                placeholder="Content"
                            />
                            <div className="flex justify-end">
                                <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                                    {loading ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-baseline gap-3">
                                <div className="text-3xl text-secondary font-semibold">{post.title}</div>
                                {post.date_created && <div className="text-xs text-gray-400">{new Date(post.date_created).toLocaleDateString()}</div>}
                            </div>
                            {post.author && <div className="text-sm text-gray-400">By {post.author}</div>}
                            {post.category && <div className="text-xs text-primary font-medium uppercase tracking-wide">{post.category}</div>}
                            <div className="border-t border-gray-200 pt-4 text-dark text-sm whitespace-pre-wrap">
                                {post.blog_content}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
