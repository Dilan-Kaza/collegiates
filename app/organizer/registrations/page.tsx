import Registrations from "./Registrations";
import { getOrganizerRegistrations, getOrganizerEvents } from "@functions/actions";
import { requireOrganizer } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

export default async function Page() {
  // Gate to organizers and resolve the registration list + full event catalogue
  // on the server so they ship with the page.
  await requireOrganizer();
  const [registrations, allEvents] = await Promise.all([
    getOrganizerRegistrations(),
    getOrganizerEvents(),
  ]);
  return (
    <>
      <CacheSeed
        entries={{
          [cacheKeys.organizerRegistrations]: registrations,
          [cacheKeys.organizerEvents]: allEvents,
        }}
      />
      <Registrations registrations={registrations} allEvents={allEvents} />
    </>
  );
}
