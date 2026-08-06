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
      {/* The builder owns unsaved ring state, so it deliberately does not bind to
          the registration/order cache — a mid-edit refetch must not reach it.
          Both are still seeded here for the console to read on the way back. */}
      <CacheSeed
        entries={{
          [cacheKeys.organizerRegistrations]: registrations,
          [cacheKeys.organizerOrder]: order,
          [cacheKeys.settings]: settings,
        }}
      />
      <EventBuilder
        registrations={registrations}
        order={order}
        orderPublic={settings?.order_public ?? false}
        regYear={settings?.reg_year ?? null}
      />
    </>
  );
}
