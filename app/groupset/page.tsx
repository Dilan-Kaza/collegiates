import Groupset from "./Groupset";
import { getJoinableGroupsets, getMyGroupset } from "@functions/actions";
import { requireUser } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page() {
  // Resolve auth and first-load data (joinable group sets + the competitor's
  // own group set) on the server so they ship with the page.
  await requireUser();
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
