import Registrations from "./Registrations";
import { getOrganizerRegistrations, getOrganizerEvents } from "@functions/actions";
import { getColleges, getSettings } from "@functions/data";
import { requireOrganizer } from "@/lib/auth";

export default async function Page() {
  // Gate to organizers, then resolve on the server: registrations, the event catalogue, colleges
  // (the profile-edit school dropdown) and settings (the fee schedule Payments prices against).
  await requireOrganizer();
  const [registrations, allEvents, colleges, settings] = await Promise.all([
    getOrganizerRegistrations(),
    getOrganizerEvents(),
    getColleges(),
    getSettings(),
  ]);
  // No seeding here: <Registrations> binds all four to their cache entries.
  return (
    <Registrations
      registrations={registrations}
      allEvents={allEvents}
      colleges={colleges}
      settings={settings ?? {}}
    />
  );
}
