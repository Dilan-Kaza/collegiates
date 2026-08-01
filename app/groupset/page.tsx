import Groupset from "./Groupset";
import { getJoinableGroupsets, getMyGroupset } from "@functions/actions";
import { requireCompetitor } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page() {
  // Group sets are a competitor feature, so gate on that — the reads below
  // return [] for anyone else, which would render an empty page instead.
  await requireCompetitor();
  const [groupSetMembers, myGroupSet] = await Promise.all([
    getJoinableGroupsets(),
    getMyGroupset(),
  ]);
  return (
    <>
      <CacheSeed
        entries={{
          [cacheKeys.joinableGroupsets]: groupSetMembers,
          [cacheKeys.groupSet]: myGroupSet,
        }}
      />
      <Groupset groupSetMembers={groupSetMembers} myGroupSet={myGroupSet} />
    </>
  );
}
