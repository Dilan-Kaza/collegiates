"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@functions/actions";
import { setSuccessMsg } from "@slices";
import { clearAllSessionCache } from "@functions/sessionCache";
import { useDispatch } from "react-redux";
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
            {loggingOut && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9999,
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "48px 64px",
                        textAlign: "center",
                        boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
                    }}>
                        <p style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
                            Logging out...
                        </p>
                    </div>
                </div>
            )}
            <button className="btn text-base w-fit" onClick={handleLogout}>
                Log Out
            </button>
        </>
    );
}
