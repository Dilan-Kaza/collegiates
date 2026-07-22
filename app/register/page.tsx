import { redirect } from "next/navigation";
import Register from "./Register";
import { getSettings } from "@functions/data";
import { getMe, getCompetitorEvents } from "@functions/actions";
import { requireUser } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page() {
  // Resolve auth and first-load data (the current user + the event catalogue
  // they're eligible for) on the server so it ships with the page.
  await requireUser();
  const [settings, userinfo, catalogEvents] = await Promise.all([
    getSettings(),
    getMe(),
    getCompetitorEvents(),
  ]);
  // Already registered? Send them to the dashboard before rendering the flow,
  // mirroring the old client-side redirect.
  if ((userinfo?.registrations?.length ?? 0) > 0) redirect("/dashboard");
  return (
    <>
      <CacheSeed
        entries={{
          [cacheKeys.settings]: settings,
          [cacheKeys.currentUser]: userinfo,
          [cacheKeys.competitorEvents]: catalogEvents,
        }}
      />
      <Register
        settings={settings ?? {}}
        catalogEvents={catalogEvents}
      />
    </>
  );
}
