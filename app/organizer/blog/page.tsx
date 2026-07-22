import BlogManager from "./BlogManager";
import { getOrganizerBlogPosts } from "@functions/actions";
import { requireOrganizer } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page() {
  // Gate to organizers and resolve the post list on the server.
  await requireOrganizer();
  const posts = await getOrganizerBlogPosts();
  return (
    <>
      <CacheSeed entries={{ [cacheKeys.organizerBlogPosts]: posts }} />
      <BlogManager posts={posts} />
    </>
  );
}
