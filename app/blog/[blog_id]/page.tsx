import Blog from "./Blog";
import { getBlogPost, getBlogPosts } from "@functions/data";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page({ params }: { params: Promise<{ blog_id: string }> }) {
  const { blog_id } = await params;
  const [post, posts] = await Promise.all([getBlogPost(blog_id), getBlogPosts()]);
  return (
    <>
      {/* The post itself is seeded by <Blog>'s own cache binding. The list has no
          client fetcher, so it stays a seed-only entry. */}
      <CacheSeed entries={{ [cacheKeys.blogPosts]: posts }} />
      <Blog post={post} posts={posts} />
    </>
  );
}
