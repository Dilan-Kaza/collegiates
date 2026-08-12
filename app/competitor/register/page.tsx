import { redirect } from "next/navigation";
import Register from "./Register";
import { getSettings } from "@functions/data";
import { getMe, getCompetitorEvents } from "@functions/actions";
import { requireCompetitor } from "@/lib/auth";

export default async function Page() {
  // Registering is competitor-only (createRegistrations enforces the same), so gate on that
  // before resolving the current user and their eligible event catalogue on the server.
  await requireCompetitor();
  const [settings, userinfo, catalogEvents] = await Promise.all([
    getSettings(),
    getMe(),
    getCompetitorEvents(),
  ]);
  // Already registered? Send them to the dashboard before rendering the flow,
  // mirroring the old client-side redirect.
  if ((userinfo?.registrations?.length ?? 0) > 0) redirect("/competitor");
  // No seeding here: <Register> binds settings, the current user, and the event
  // catalogue to their cache entries, which is what seeds them.
  return (
    <Register
      settings={settings ?? {}}
      catalogEvents={catalogEvents}
      userinfo={userinfo}
    />
  );
}
