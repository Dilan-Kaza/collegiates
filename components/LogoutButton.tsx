"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@functions/actions";
import { setErrorMsg, setSuccessMsg } from "@slices";
import { clearAllSessionCache } from "@functions/sessionCache";
import { useAppDispatch } from "@/store/hooks";
import LoadingScreen from "./LoadingScreen";

/**
 * Signs the user out and clears every cached trace of them.
 *
 * @remarks
 * Three things have to happen together: the session cookie is cleared
 * server-side, the whole `sessionStorage` cache is dropped — it holds the
 * previous user's data — and `router.refresh()` re-seeds `SessionProvider` as
 * unauthenticated so the session hooks respond.
 *
 * If the sign-out **fails**, none of that happens: the cookie may well still be
 * set, and clearing the cache would show a signed-out UI over a live session.
 */
export default function LogoutButton() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            const res = await logoutAction();
            if (!res.ok) {
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
