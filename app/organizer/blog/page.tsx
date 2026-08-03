import BlogManager from "./BlogManager";
import { getOrganizerBlogPosts } from "@functions/actions";
import { requireOrganizer } from "@/lib/auth";

export default async function Page() {
  // Gate to organizers and resolve the post list on the server.
  await requireOrganizer();
  const posts = await getOrganizerBlogPosts();
  // No CacheSeed: BlogManager binds this list to its cache entry itself.
  return <BlogManager posts={posts} />;
}
