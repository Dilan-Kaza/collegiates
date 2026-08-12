"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@functions/actions";
import { setErrorMsg, setSuccessMsg } from "@slices";
import { clearAllSessionCache } from "@functions/sessionCache";
import { useAppDispatch } from "@/store/hooks";
import LoadingScreen from "./LoadingScreen";
// logout button


export default function LogoutButton() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        // logoutAction clears the session cookie server-side; router.refresh()
        // re-seeds SessionProvider as unauthenticated so the hooks respond.
        try {
            const res = await logoutAction();
            if (!res.ok) {
                // The cookie may still be set, so clearing the cache here would
                // show a signed-out UI over a live session. Leave both alone.
                dispatch(setErrorMsg(res.error ?? "Could not log you out. Please try again."));
                return;
            }
            clearAllSessionCache();
            dispatch(setSuccessMsg("Successfully logged out!"));
            router.refresh();
        } catch (err) {
            console.error("[logoutAction]", err);
            dispatch(setErrorMsg("Could not log you out. Please try again."));
        } finally {
            // Always released — otherwise a failed logout leaves the full-screen
            // overlay up with no way back.
            setLoggingOut(false);
        }
    };

    return (
        <>
            {loggingOut && <LoadingScreen boxed />}
            <button className="btn text-base w-fit" onClick={handleLogout} disabled={loggingOut}>
                Log Out
            </button>
        </>
    );
}
