import GroupsetPage from "./GroupsetPage";
import { getOrganizerGroupsets } from "@functions/actions";
import { getColleges } from "@functions/data";
import { requireOrganizer } from "@/lib/auth";

export default async function Page() {
  // Gate to organizers, then resolve the list and the create form's school
  // options on the server — independent reads, so they go out together.
  await requireOrganizer();
  const [groupsets, colleges] = await Promise.all([getOrganizerGroupsets(), getColleges()]);
  // The list and the college options are seeded by <GroupsetPage>'s own cache bindings.
  return <GroupsetPage groupsets={groupsets} colleges={colleges} />;
}
