import GroupsetPage from "./GroupsetPage";
import { getOrganizerGroupsets } from "@functions/actions";
import { requireOrganizer } from "@/lib/auth";

export default async function Page() {
  // Gate to organizers and resolve the group set list on the server.
  await requireOrganizer();
  const groupsets = await getOrganizerGroupsets();
  // No CacheSeed: GroupsetPage binds this list to its cache entry itself.
  return <GroupsetPage groupsets={groupsets} />;
}
