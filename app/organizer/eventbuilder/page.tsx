import EventBuilder from "./EventBuilder";
import { getOrganizerRegistrations, getOrganizerOrder } from "@functions/actions";
import { getSettings } from "@functions/data";
import { requireOrganizer } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page() {
  // Gate to organizers and resolve registrations, order, and settings server-side
  // so the builder ships populated. Publish state comes from settings.order_public.
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
