import Home from "./Home";
import { getSettings, getBlogPosts } from "@functions/data";
// home page (server component)

export default async function Page() {
  const [settings, posts] = await Promise.all([getSettings(), getBlogPosts()]);
  return <Home settings={settings ?? {}} posts={posts} />;
}
