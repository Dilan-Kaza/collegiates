import { BlogCategory } from "@components";
import { getBlogPosts } from "@functions/data";

export default async function Page() {
  const posts = await getBlogPosts();
  return <BlogCategory category="Multimedia" posts={posts} />;
}
