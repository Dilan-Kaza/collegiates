import Organizer from "./Organizer";
import { getSettings } from "@functions/data";

export default async function Page() {
  const settings = await getSettings();
  return <Organizer settings={settings ?? {}} />;
}
