import { requireUser, canAccessOrganizer } from "@/lib/auth";
import { MtHeader, Heading } from "@components";
import { Link } from "@/routerCompat";
// static "check your inbox" page shown after requesting an email change

export default async function Page() {
  const user = await requireUser();
  // This page is reachable by any account type, so "back" has to route the
  // same way SignIn's landingRoute() does rather than assuming /competitor.
  const dashboardHref = (await canAccessOrganizer(user)) ? "/organizer" : "/competitor";
  return (
    <>
      <div className="hidden sm:block"><MtHeader /></div>
      <div className="flex items-center justify-center px-4">
        <div className="grow min-w-0 bg-off-white max-w-[36rem] mt-0 sm:mt-10 rounded-xl border border-brown/50">
          <div className="flex flex-col items-center gap-4 px-4 sm:px-12 py-10 text-center">
            <Heading className="!text-3xl !p-2 !animate-none">Check Your Inbox</Heading>
            <p className="text-gray-600">
              We sent a confirmation link to your new email address. Click it to finish updating your email.
            </p>
            <Link to={dashboardHref} className="btn btn-primary">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    </>
  );
}
