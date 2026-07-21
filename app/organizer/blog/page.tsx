"use client";

import { MtHeader, OrganizerBlogList } from "@components";
import { setErrorMsg } from "@slices";
import { createBlogPost } from "@functions/actions";
import { useState } from "react";
import { useNavigate } from "@/routerCompat";
import { useForwardIfNotOrganizer } from "@functions";
import { useDispatch } from "react-redux";

export default function OrganizerBlog() {

    useForwardIfNotOrganizer();
    const nav = useNavigate();
    const dispatch = useDispatch();
    const [title, setTitle] = useState("");
    const [blog_content, setBlogContent] = useState("");
    const [author, setAuthor] = useState("");
    const [category, setCategory] = useState("");
    const [loading, setLoading] = useState(false);
    const [listKey, setListKey] = useState(0);

    const handlePost = async () => {
        if (!title.trim() || !blog_content.trim() || !category) return;
        setLoading(true);
        const { error } = await createBlogPost({ title, blog_content, author, category });
        if (error) {
            dispatch(setErrorMsg(error.detail ?? "Failed to post blog"));
        } else {
            setListKey(k => k + 1); // remounts OrganizerBlogList -> re-fetches fresh
            setTitle("");
            setBlogContent("");
            setAuthor("");
            setCategory("");
        }
        setLoading(false);
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
                    <OrganizerBlogList key={listKey} />
                </div>
            </div>
        </>
    );
}
