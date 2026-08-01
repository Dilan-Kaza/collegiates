import { BlogCategory } from "@components";
import { getBlogPosts } from "@functions/data";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page() {
  const posts = await getBlogPosts();
  return (
    <>
      <CacheSeed entries={{ [cacheKeys.blogPosts]: posts }} />
      <BlogCategory category="Multimedia" posts={posts} />
    </>
  );
}
