"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@functions/actions";
import { setSuccessMsg } from "@slices";
import { clearAllSessionCache } from "@functions/sessionCache";
import { useAppDispatch } from "@/store/hooks";
import LoadingScreen from "./LoadingScreen";
// logout button


export default function LogoutButton() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        // logoutAction clears the session cookie server-side; router.refresh()
        // re-seeds SessionProvider as unauthenticated so the hooks respond.
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
