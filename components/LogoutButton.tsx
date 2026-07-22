"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@functions/actions";
import { setSuccessMsg } from "@slices";
import { clearAllSessionCache } from "@functions/sessionCache";
import { useDispatch } from "react-redux";
import LoadingScreen from "./LoadingScreen";
// logout button


export default function LogoutButton() {
    const dispatch = useDispatch();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        // The logoutAction server action clears the Auth.js session cookie
        // server-side (no /api/auth endpoint). router.refresh() re-runs the
        // layout, re-seeding SessionProvider as unauthenticated so useSession-
        // based redirect hooks respond.
        await logoutAction();
        clearAllSessionCache();
        dispatch(setSuccessMsg("Successfully logged out!"));
        router.refresh();
    };

    return (
        <>
            {loggingOut && <LoadingScreen boxed />}
            <button className="btn text-base w-fit" onClick={handleLogout}>
                Log Out
            </button>
        </>
    );
}
