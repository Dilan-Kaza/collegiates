import Tournament from "./Tournament";
import { getSettings } from "@functions/data";

export default async function Page() {
  const settings = await getSettings();
  // <Tournament> binds settings to its cache entry, which is what seeds it.
  return <Tournament settings={settings ?? {}} />;
}
