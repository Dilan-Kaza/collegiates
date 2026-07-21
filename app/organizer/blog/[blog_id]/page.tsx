"use client";

import { MtHeader } from "@components";
import { useForwardIfNotOrganizer } from "@functions";
import { setErrorMsg } from "@slices";
import { getBlogPostById, updateBlogPost } from "@functions/actions";
import { useParams, useNavigate } from "@/routerCompat";
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import type { BlogDTO } from "@/lib/api";
// organizer blog post editor

export default function OrganizerBlogPost() {

    useForwardIfNotOrganizer();
    const blog_id = useParams().blog_id as string;
    const nav = useNavigate();
    const dispatch = useDispatch();

    const [post, setPost] = useState<Partial<BlogDTO>>({});
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!blog_id) return;
        getBlogPostById(blog_id)
            .then((data) => setPost(data ?? {}))
            .catch((err) => console.warn("Could not fetch blog post", err));
    }, [blog_id]);

    useEffect(() => {
        if (post && Object.keys(post).length > 0) {
            setForm({
                title: post.title ?? "",
                author: post.author ?? "",
                category: post.category ?? "",
                blog_content: post.blog_content ?? "",
            });
        }
    }, [post]);

    const handleSave = async () => {
        setLoading(true);
        const { data, error } = await updateBlogPost(blog_id, form);
        if (error) {
            dispatch(setErrorMsg(error.detail ?? "Failed to save post"));
        } else {
            setPost(data ?? {});
            setEditing(false);
        }
        setLoading(false);
    };

    return (
        <>
            <div className="hidden md:block"><MtHeader /></div>
            <div className="max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <button className="btn btn-primary btn-sm" onClick={() => nav("/organizer/blog")}>← Back</button>
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
