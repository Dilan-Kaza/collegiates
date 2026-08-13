import EventBuilder from "./EventBuilder";
import { getOrganizerRegistrations, getOrganizerOrder } from "@functions/actions";
import { getSettings } from "@functions/data";
import { requireOrganizer } from "@/lib/auth";

export default async function Page() {
  // Gate to organizers and resolve registrations, order, and settings server-side
  // so the builder ships populated. Publish state comes from settings.order_public.
  await requireOrganizer();
  const [registrations, order, settings] = await Promise.all([
    getOrganizerRegistrations(),
    getOrganizerOrder(),
    getSettings(),
  ]);
  // No seeding: the builder owns unsaved ring state and must not be reached by a
  // mid-edit refetch. The console re-reads from its own server props on return.
  return (
    <EventBuilder
      registrations={registrations}
      order={order}
      orderPublic={settings?.order_public ?? false}
      regYear={settings?.reg_year ?? null}
    />
  );
}
