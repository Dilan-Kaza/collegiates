import OrganizerSettings from "./OrganizerSettings";
import { getSettings } from "@functions/data";
import { requireOrganizer } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page() {
  // Gate to organizers before anything is fetched or rendered, like every other
  // route under /organizer — a client-side redirect would render settings first.
  await requireOrganizer();
  const settings = await getSettings();
  return (
    <>
      <CacheSeed entries={{ [cacheKeys.settings]: settings }} />
      <OrganizerSettings settings={settings ?? {}} />
    </>
  );
}
