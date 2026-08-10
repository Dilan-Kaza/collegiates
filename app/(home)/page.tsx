import Home from "./Home";
import { getSettings, getBlogPosts } from "@functions/data";
// home page (server component)

export default async function Page() {
  const [settings, posts] = await Promise.all([getSettings(), getBlogPosts()]);
  // <Home> binds both to their cache entries, which is what seeds them.
  return <Home settings={settings ?? {}} posts={posts} />;
}
