import SignUp from "./SignUp";
import { getColleges } from "@functions/data";

export default async function Page() {
  const colleges = await getColleges();
  return <SignUp colleges={colleges} />;
}
