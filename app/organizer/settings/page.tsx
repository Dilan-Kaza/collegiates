import OrganizerSettings from "./OrganizerSettings";
import { getSettings } from "@functions/data";
import { requireOrganizer } from "@/lib/auth";

export default async function Page() {
  // Gate to organizers before anything is fetched or rendered, like every other
  // route under /organizer — a client-side redirect would render settings first.
  await requireOrganizer();
  const settings = await getSettings();
  // <OrganizerSettings> binds settings to its cache entry, which is what seeds it.
  return <OrganizerSettings settings={settings ?? {}} />;
}
