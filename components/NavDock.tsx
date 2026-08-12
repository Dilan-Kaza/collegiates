"use client";

import { Link } from "@/routerCompat";
import { useSession } from "@functions/sessionContext";

// `firstName` and `liveScores` are resolved by the root layout on the server, so the account
// label and Live button render with no client fetch. Live shows only when openable — see NavBar.
export default function NavDock({ firstName = "", liveScores = false }: { firstName?: string; liveScores?: boolean }){

    const { data: session } = useSession();
    const username = firstName;
    const userType = session?.user?.user_type;
    const accountHref = username
        ? (userType === "Admin" ? "/admin" : userType === "School" ? "/organizer" : "/competitor")
        : "/signin";

    return (
        <div className="dock z-10">
            <Link to="/">
                <i className="bi bi-house-door"></i>
                <span className="dock-label">Home</span>
            </Link>

            <Link to="/about">
                <i className="bi bi-info-square"></i>
                <span className="dock-label">About</span>
            </Link>

            <Link to="/tournament">
                <i className="bi bi-bank"></i>
                <span className="dock-label">Tournament</span>
            </Link>

            {liveScores && (
                <Link to="/live">
                    <i className="bi bi-broadcast"></i>
                    <span className="dock-label">Live</span>
                </Link>
            )}

            <Link to={accountHref}>
                <i className="bi bi-person-circle"></i>
                <span className="dock-label">{username || "Login"}</span>
            </Link>
        </div>
    );
}
