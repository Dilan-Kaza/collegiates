import GroupsetPage from "./GroupsetPage";
import { getOrganizerGroupsets } from "@functions/actions";
import { getColleges } from "@functions/data";
import { requireOrganizer } from "@/lib/auth";

export default async function Page() {
  // Gate to organizers, then resolve the list and the create form's school
  // options on the server — independent reads, so they go out together.
  await requireOrganizer();
  const [groupsets, colleges] = await Promise.all([getOrganizerGroupsets(), getColleges()]);
  // No CacheSeed: GroupsetPage binds this list to its cache entry itself.
  return <GroupsetPage groupsets={groupsets} colleges={colleges} />;
}
