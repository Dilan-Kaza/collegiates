"use client";

import Image from "next/image";
import { Link } from "@/routerCompat";
import { useSession } from "@functions/sessionContext";

const tabs = ["Tournament", "Rules", "About", "News", "Multimedia"];

// `firstName` and `liveScores` are resolved by the root layout on the server, so both render
// with no client fetch. Live is listed first, and only when the viewer can actually open it.
function NavBar({ firstName = "", liveScores = false }: { firstName?: string; liveScores?: boolean }) {

  const { data: session } = useSession();
  const username = firstName;
  const userType = session?.user?.user_type;
  const accountHref =
    userType === "Admin" ? "/admin" : userType === "School" ? "/organizer" : "/competitor";

  return (
    <div className="fixed w-[70%] top-4 left-[15%] p-4 bg-primary text-off-white rounded-lg px-12 z-100">
      <div className="justify-between flex w-full">
        <div className="flex gap-10 items-center">

          {/* The source PNG's intrinsic 1382x511, so it renders uncropped; CSS
              pins the height and next/image still serves it downscaled. */}
          <Link to="/" className="shrink-0"><Image
                    src="/wushu_logo.png"
                    alt="logo"
                    width={1382}
                    height={511}
                    priority
                    className="h-10 w-auto rounded-lg"
                  /></Link>
          {(liveScores ? ["Live", ...tabs] : tabs).map((tab) => (
            <Link to={`/${tab.toLowerCase().replace(/\s/g, "")}`} key={tab}>
              {tab}
            </Link>
          ))}
        </div>
        {/* Links, not buttons: an `href` lets Next prefetch and restores
            middle-click. The click still routes through NavigationProvider. */}
        {username ?
          <Link to={accountHref} className="btn btn-outline [--btn-color:var(--color-off-white)]">{username}</Link> :
          <Link to="/signin" className="btn btn-outline [--btn-color:var(--color-off-white)]">Sign In</Link>
        }
      </div>
    </div>
  );
}

export { NavBar };
