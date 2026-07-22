import EventBuilder from "./EventBuilder";
import { getOrganizerRegistrations, getOrganizerOrder } from "@functions/actions";
import { getSettings } from "@functions/data";
import { requireOrganizer } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page() {
  // Gate to organizers and resolve the registration list, saved order, and
  // settings on the server so the builder ships populated. Publicity of the
  // order now lives on Settings (order_public), so it's read from there.
  await requireOrganizer();
  const [registrations, order, settings] = await Promise.all([
    getOrganizerRegistrations(),
    getOrganizerOrder(),
    getSettings(),
  ]);
  return (
    <>
      <CacheSeed
        entries={{
          [cacheKeys.organizerRegistrations]: registrations,
          [cacheKeys.organizerOrder]: order,
          [cacheKeys.settings]: settings,
        }}
      />
      <EventBuilder registrations={registrations} order={order} orderPublic={settings?.order_public ?? false} />
    </>
  );
}
