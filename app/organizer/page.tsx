import Organizer from "./Organizer";
import { getSettings } from "@functions/data";
import {
  getOrganizerRegistrations,
  getOrganizerGroupsets,
  getOrganizerOrder,
  getOrganizerBlogPosts,
} from "@functions/actions";
import { requireOrganizer } from "@/lib/auth";

export default async function Page() {
  // Gate to organizers and resolve every panel's data on the server so the
  // dashboard ships fully populated — no client fetches, no per-panel loading.
  await requireOrganizer();
  const [settings, registrations, groupsets, order, blogPosts] = await Promise.all([
    getSettings(),
    getOrganizerRegistrations(),
    getOrganizerGroupsets(),
    getOrganizerOrder(),
    getOrganizerBlogPosts(),
  ]);
  // No seeding here: every panel's payload is seeded by its own binding in <Organizer>.
  return (
    <Organizer
      settings={settings ?? {}}
      registrations={registrations}
      groupsets={groupsets}
      order={order}
      blogPosts={blogPosts}
    />
  );
}
