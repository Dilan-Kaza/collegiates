"use client";

import { useNavigate } from "@/routerCompat";
import { fetchCurrentUser } from "@functions";
import { useSession } from "@functions/sessionContext";
import { useState, useEffect } from "react";

export default function NavDock(){

    const nav = useNavigate();
    const { status } = useSession();
    const [username, setUsername] = useState("");

    useEffect(() => {
        if (status === "authenticated") {
            fetchCurrentUser().then((u) => setUsername(u.first_name ?? ""));
        } else {
            setUsername("");
        }
    }, [status]);

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

            <button onClick={()=>nav(username ? "/dashboard" : "/signin")}>
                <i className="bi bi-person-circle"></i>
                <span className="dock-label">{username || "Login"}</span>
            </button>
        </div>
    );
}
