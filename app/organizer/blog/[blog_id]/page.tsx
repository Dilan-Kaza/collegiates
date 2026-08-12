import BlogEditor from "./BlogEditor";
import { getBlogPostById } from "@functions/actions";
import { requireOrganizer } from "@/lib/auth";
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

  // No seeding here: the editor owns the post as local state so an unsaved draft is never
  // replaced by a refetch. The public /blog/[blog_id] view is what binds that key, and this
  // editor drops it on save so that view re-reads.
  return <BlogEditor blogId={blog_id} post={post} />;
}
