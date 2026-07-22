import OrganizerSettings from "./OrganizerSettings";
import { getSettings } from "@functions/data";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page() {
  const settings = await getSettings();
  return (
    <>
      <CacheSeed entries={{ [cacheKeys.settings]: settings }} />
      <OrganizerSettings settings={settings ?? {}} />
    </>
  );
}
