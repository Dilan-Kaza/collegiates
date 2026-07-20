"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useDispatch } from "react-redux";
import { setErrorMsg } from "@slices";
import { findUserByEmail } from "@functions/actions";

interface OrganizerFindUserProps {
  onFound?: (userId: string, name: string) => void;
}

export default function OrganizerFindUser({ onFound }: OrganizerFindUserProps) {

    const dispatch = useDispatch();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const user = await findUserByEmail(email);
        if (user) {
            onFound?.(user.user_id, user.name);
            setEmail("");
        } else {
            dispatch(setErrorMsg("User not found"));
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            <input
                type="email"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-primary flex-1"
                placeholder="Search by email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={loading}>
                {loading ? "..." : "Find"}
            </button>
        </form>
    );
}
