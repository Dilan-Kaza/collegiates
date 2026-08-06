import Registrations from "./Registrations";
import { getOrganizerRegistrations, getOrganizerEvents } from "@functions/actions";
import { getColleges, getSettings } from "@functions/data";
import { requireOrganizer } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

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
  return (
    <>
      {/* The list and the catalogue are seeded by <Registrations>' own bindings;
          `colleges` and `settings` have no client fetcher, so they stay seed-only. */}
      <CacheSeed entries={{ [cacheKeys.colleges]: colleges, [cacheKeys.settings]: settings }} />
      <Registrations
        registrations={registrations}
        allEvents={allEvents}
        colleges={colleges}
        settings={settings ?? {}}
      />
    </>
  );
}
