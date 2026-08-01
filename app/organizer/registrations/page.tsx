import Registrations from "./Registrations";
import { getOrganizerRegistrations, getOrganizerEvents } from "@functions/actions";
import { getColleges } from "@functions/data";
import { requireOrganizer } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page() {
  // Gate to organizers and resolve the registration list, full event catalogue,
  // and college list (for the profile-edit school dropdown) on the server.
  await requireOrganizer();
  const [registrations, allEvents, colleges] = await Promise.all([
    getOrganizerRegistrations(),
    getOrganizerEvents(),
    getColleges(),
  ]);
  return (
    <>
      <CacheSeed
        entries={{
          [cacheKeys.organizerRegistrations]: registrations,
          [cacheKeys.organizerEvents]: allEvents,
          [cacheKeys.colleges]: colleges,
        }}
      />
      <Registrations registrations={registrations} allEvents={allEvents} colleges={colleges} />
    </>
  );
}
