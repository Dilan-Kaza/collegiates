import BlogEditor from "./BlogEditor";
import { getBlogPostById } from "@functions/actions";
import { requireOrganizer } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";
// organizer blog post editor (server component)

export default async function Page({ params }: { params: Promise<{ blog_id: string }> }) {
  // Gate to organizers and resolve the post before rendering — a client-side
  // check plus mount fetch flashed an empty editor and rendered for non-organizers.
  await requireOrganizer();
  const { blog_id } = await params;
  const post = await getBlogPostById(blog_id);

  if (!post) {
    return <div className="text-sm text-gray-400 max-w-3xl mx-auto w-full px-4 py-8">Post not found.</div>;
  }

  return (
    <>
      <CacheSeed entries={{ [cacheKeys.blogPost(blog_id)]: post }} />
      <BlogEditor blogId={blog_id} post={post} />
    </>
  );
}
