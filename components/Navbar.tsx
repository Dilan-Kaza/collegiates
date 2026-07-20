"use client";

import { Link, useNavigate } from "@/routerCompat";
import { fetchCurrentUser } from "@functions";
import { useSession } from "@functions/sessionContext";
import { useState, useEffect } from "react";

const tabs = ["Tournament", "Rules", "About", "News", "Multimedia"];

function NavBar() {

  const { data: session, status } = useSession();
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      fetchCurrentUser().then((u) => setUsername(u.first_name ?? ""));
    } else {
      setUsername("");
    }
  }, [status]);

  const nav = useNavigate();

  return (
    <div className="fixed w-[70%] top-4 left-[15%] p-4 bg-primary text-off-white rounded-lg px-12 z-100">
      <div className="justify-between flex w-full">
        <div className="flex gap-10 items-center">

          <Link to="/"><img
                    src="/wushu_logo.png"
                    alt="logo"
                    width={100}
                    height={100}
                    className="object-cover rounded-[2rem]"
                  /></Link>
          {tabs.map((tab) => (
            <Link to={`/${tab.toLowerCase().replace(/\s/g, "")}`} key={tab}>
              {tab}
            </Link>
          ))}
          {session?.user?.user_type === "O" && (
            <Link to="/organizer">Organizer</Link>
          )}
        </div>
        {username ?
          <button className="btn btn-outline [--btn-color:var(--color-off-white)]" onClick={()=>nav('/dashboard')}>{username}</button> :
          <button className="btn btn-outline [--btn-color:var(--color-off-white)]" onClick={()=>nav('/signin')}>Sign In</button>
        }
      </div>
    </div>
  );
}

export { NavBar };
