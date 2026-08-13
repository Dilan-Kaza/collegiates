import { BlogCategory } from "@components";
import { getBlogPosts } from "@functions/data";

export default async function Page() {
  const posts = await getBlogPosts();
  // <BlogCategory> binds the list to its cache entry, which is what seeds it.
  return <BlogCategory category="News" posts={posts} />;
}
