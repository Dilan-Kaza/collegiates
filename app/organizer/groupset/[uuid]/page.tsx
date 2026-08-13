import GroupsetDetail from "./GroupsetDetail";
import { getOrganizerGroupset } from "@functions/actions";
import { requireOrganizer } from "@/lib/auth";

export default async function Page({ params }: { params: Promise<{ uuid: string }> }) {
  // Gate to organizers and resolve the group set (by uuid) on the server.
  await requireOrganizer();
  const { uuid } = await params;
  const groupset = await getOrganizerGroupset(uuid);

  if (!groupset) {
    return <div className="text-sm text-gray-400 max-w-3xl mx-auto w-full px-4 py-8">Group set not found.</div>;
  }

  return (
    <>
      {/* Keyed on the uuid: the detail view seeds its edit fields at mount and
          never re-syncs, so moving to another team must remount it. */}
      <GroupsetDetail key={uuid} uuid={uuid} groupset={groupset} />
    </>
  );
}
