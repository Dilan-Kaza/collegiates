import GroupsetPage from "./GroupsetPage";
import { getOrganizerGroupsets } from "@functions/actions";
import { requireOrganizer } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page() {
  // Gate to organizers and resolve the group set list on the server.
  await requireOrganizer();
  const groupsets = await getOrganizerGroupsets();
  return (
    <>
      <CacheSeed entries={{ [cacheKeys.organizerGroupsets]: groupsets }} />
      <GroupsetPage groupsets={groupsets} />
    </>
  );
}
