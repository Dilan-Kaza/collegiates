import Blog from "./Blog";
import { getBlogPost, getBlogPosts } from "@functions/data";

export default async function Page({ params }: { params: Promise<{ blog_id: string }> }) {
  const { blog_id } = await params;
  const [post, posts] = await Promise.all([getBlogPost(blog_id), getBlogPosts()]);
  // <Blog> binds the post and the sidebar list to their cache entries, which is
  // what seeds them.
  return <Blog post={post} posts={posts} />;
}
