import Dashboard from "./Dashboard";
import { getSettings } from "@functions/data";

export default async function Page() {
  const settings = await getSettings();
  return <Dashboard settings={settings ?? {}} />;
}
