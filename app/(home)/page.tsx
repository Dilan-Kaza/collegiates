import Home from "./Home";
import { getSettings, getBlogPosts } from "@functions/data";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";
// home page (server component)

export default async function Page() {
  const [settings, posts] = await Promise.all([getSettings(), getBlogPosts()]);
  return (
    <>
      <CacheSeed entries={{ [cacheKeys.settings]: settings, [cacheKeys.blogPosts]: posts }} />
      <Home settings={settings ?? {}} posts={posts} />
    </>
  );
}
