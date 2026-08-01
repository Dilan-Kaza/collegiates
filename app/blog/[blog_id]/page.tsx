import Blog from "./Blog";
import { getBlogPost, getBlogPosts } from "@functions/data";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page({ params }: { params: Promise<{ blog_id: string }> }) {
  const { blog_id } = await params;
  const [post, posts] = await Promise.all([getBlogPost(blog_id), getBlogPosts()]);
  return (
    <>
      <CacheSeed
        entries={{
          [cacheKeys.blogPost(blog_id)]: post,
          [cacheKeys.blogPosts]: posts,
        }}
      />
      <Blog post={post ?? {}} posts={posts} />
    </>
  );
}
