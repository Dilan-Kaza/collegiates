import OrganizerSettings from "./OrganizerSettings";
import { getSettings } from "@functions/data";

export default async function Page() {
  const settings = await getSettings();
  return <OrganizerSettings settings={settings ?? {}} />;
}
