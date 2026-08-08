"use client";

import { useNavigate } from "@/routerCompat";
import { useSession } from "@functions/sessionContext";

// `firstName` is resolved on the server by the root layout and passed in, so the
// dock's account label renders immediately with no client fetch.
export default function NavDock({ firstName = "" }: { firstName?: string }){

    const { data: session } = useSession();
    const nav = useNavigate();
    const username = firstName;
    const userType = session?.user?.user_type;
    const accountHref = username
        ? (userType === "Admin" ? "/admin" : userType === "School" ? "/organizer" : "/competitor")
        : "/signin";

    return (
        <div className="dock z-10">
            <button onClick={()=>nav("/")}>
                <i className="bi bi-house-door"></i>
                <span className="dock-label">Home</span>
            </button>

            <button onClick={()=>nav("/about")}>
                <i className="bi bi-info-square"></i>
                <span className="dock-label">About</span>
            </button>

            <button onClick={()=>nav("/tournament")}>
                <i className="bi bi-bank"></i>
                <span className="dock-label">Tournament</span>
            </button>

            <button onClick={()=>nav(accountHref)}>
                <i className="bi bi-person-circle"></i>
                <span className="dock-label">{username || "Login"}</span>
            </button>
        </div>
    );
}
