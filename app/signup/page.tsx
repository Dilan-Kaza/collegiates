import SignUp from "./SignUp";
import { getColleges } from "@functions/data";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page() {
  const colleges = await getColleges();
  return (
    <>
      <CacheSeed entries={{ [cacheKeys.colleges]: colleges }} />
      <SignUp colleges={colleges} />
    </>
  );
}
