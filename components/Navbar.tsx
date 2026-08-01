"use client";

import Image from "next/image";
import { Link, useNavigate } from "@/routerCompat";
import { useSession } from "@functions/sessionContext";

const tabs = ["Tournament", "Rules", "About", "News", "Multimedia"];

// `firstName` is resolved on the server by the root layout and passed in, so the
// signed-in user's name renders immediately with no client fetch.
function NavBar({ firstName = "" }: { firstName?: string }) {

  const { data: session } = useSession();
  const username = firstName;
  const userType = session?.user?.user_type;
  const accountHref =
    userType === "Admin" ? "/admin" : userType === "School" ? "/organizer" : "/dashboard";

  const nav = useNavigate();

  return (
    <div className="fixed w-[70%] top-4 left-[15%] p-4 bg-primary text-off-white rounded-lg px-12 z-100">
      <div className="justify-between flex w-full">
        <div className="flex gap-10 items-center">

          {/* Rendered at 100x100 on every page, but the source is a 656KB
              1382x511 PNG that was being shipped whole. next/image serves it at
              the size it's displayed. */}
          <Link to="/"><Image
                    src="/wushu_logo.png"
                    alt="logo"
                    width={100}
                    height={100}
                    priority
                    className="object-cover rounded-[2rem]"
                  /></Link>
          {tabs.map((tab) => (
            <Link to={`/${tab.toLowerCase().replace(/\s/g, "")}`} key={tab}>
              {tab}
            </Link>
          ))}
        </div>
        {username ?
          <button className="btn btn-outline [--btn-color:var(--color-off-white)]" onClick={()=>nav(accountHref)}>{username}</button> :
          <button className="btn btn-outline [--btn-color:var(--color-off-white)]" onClick={()=>nav('/signin')}>Sign In</button>
        }
      </div>
    </div>
  );
}

export { NavBar };
