import BlogManager from "./BlogManager";
import { getOrganizerBlogPosts } from "@functions/actions";
import { requireOrganizer } from "@/lib/auth";

export default async function Page() {
  // Gate to organizers and resolve the post list on the server.
  await requireOrganizer();
  const posts = await getOrganizerBlogPosts();
  // The list is seeded by <BlogManager>'s own cache binding.
  return <BlogManager posts={posts} />;
}
