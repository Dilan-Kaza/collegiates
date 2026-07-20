import Tournament from "./Tournament";
import { getSettings } from "@functions/data";

export default async function Page() {
  const settings = await getSettings();
  return <Tournament settings={settings ?? {}} />;
}
