import Register from "./Register";
import { getSettings } from "@functions/data";

export default async function Page() {
  const settings = await getSettings();
  return <Register settings={settings ?? {}} />;
}
