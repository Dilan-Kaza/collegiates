import Groupset from "./Groupset";
import { getJoinableGroupsets, getMyGroupset } from "@functions/actions";
import { requireCompetitor } from "@/lib/auth";
import { isClassOne } from "@/lib/api";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page() {
  // Group sets are a competitor feature, so gate on that — the reads below
  // return [] for anyone else, which would render an empty page instead.
  const user = await requireCompetitor();
  // The team competition is Class 1 only; the form is replaced with a notice
  // rather than left to fail on submit. createGroupset/joinGroupset re-check.
  const classOne = isClassOne(user.competitor_profile?.student_type);
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
      <Groupset groupSetMembers={groupSetMembers} myGroupSet={myGroupSet} classOne={classOne} />
    </>
  );
}
