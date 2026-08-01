"use client";

import { useState } from "react";
import { createGroupset, joinGroupset } from "@functions/actions";
import { clearSessionCache } from "@functions/sessionCache";
import { ShortAnswer, Dropdown, MtHeader } from "@components";
import type { GroupsetDTO } from "@/lib/api";
// competitor groupset create/join page

// Joinable group sets and the competitor's own arrive as initial state from the
// server. After a create/join the component refetches its own to reflect it.
export default function Groupset({
    groupSetMembers: initialMembers = [],
    myGroupSet: initialMine = [],
}: {
    groupSetMembers?: GroupsetDTO[];
    myGroupSet?: GroupsetDTO[];
}){

    const [mode, setMode] = useState("create");
    const [createName, setCreateName] = useState("");
    const [joinName, setJoinName] = useState("");
    const [groupSetMembers] = useState<GroupsetDTO[]>(initialMembers);
    const [myGroupSet, setMyGroupSet] = useState<GroupsetDTO[]>(initialMine);
    const [submitting, setSubmitting] = useState(false);

    const groupSetOptions = Object.fromEntries(groupSetMembers.map((g) => [g.team_name, g.groupset_id]));
    const myTeam = myGroupSet?.[0];

    // Both actions return the resulting group set, so the roster comes straight
    // from the response. Stale cache entries are still dropped for other views.
    const applyResult = (groupset: GroupsetDTO) => {
        clearSessionCache("groupSet");
        // The group set is now bundled into getMe, so refresh that cache too.
        clearSessionCache("currentUser");
        setMyGroupSet([groupset]);
    };

    const onCreate = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const { data, error } = await createGroupset({ team_name: createName });
            if (!error && data) applyResult(data);
        } finally {
            setSubmitting(false);
        }
    };

    const onJoin = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const { data, error } = await joinGroupset({ groupset: joinName });
            if (!error && data) applyResult(data);
        } finally {
            setSubmitting(false);
        }
    };

    return(
        <>
            <div className="hidden sm:block"><MtHeader /></div>
            <div className="relative overflow-hidden bg-primary rounded-3xl mx-6 mt-2 sm:mt-6 px-6 pb-6 sm:pb-12 flex justify-center">
                <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-secondary/25 blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-tertiary/50 blur-3xl pointer-events-none" />
                <div className="absolute top-1/4 left-1/2 w-48 h-48 rounded-full bg-secondary/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 mt-4 sm:mt-10 w-full max-w-sm">
                <div className="grow bg-off-white max-w-sm rounded-xl border border-brown/50 p-8 flex flex-col gap-6">
                    {myTeam ? (
                        <>
                            <div className="text-2xl font-semibold text-center">Your Team</div>
                            <div className="text-center text-lg font-medium text-primary">{myTeam.team_name}</div>
                            <div className="text-center text-sm text-brown/70">{myTeam.school}</div>
                            {myTeam.members?.length > 0 && (
                                <div className="flex flex-col gap-1">
                                    <div className="text-xs uppercase tracking-wide text-brown/50 text-center">Members</div>
                                    {myTeam.members.map((m, i) => (
                                        <div key={i} className="text-sm text-center border border-brown/15 rounded px-2 py-1">{m}</div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                    <>
                    <div className="flex rounded-lg border border-brown/20 overflow-hidden">
                        <button
                            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "create" ? "bg-primary text-white" : "hover:bg-brown/5"}`}
                            onClick={() => setMode("create")}
                        >
                            Create
                        </button>
                        <button
                            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "join" ? "bg-primary text-white" : "hover:bg-brown/5"}`}
                            onClick={() => setMode("join")}
                        >
                            Join
                        </button>
                    </div>

                    {mode === "create" ? (
                        <>
                            <div className="text-2xl font-semibold text-center">Create a Team</div>
                            <ShortAnswer
                                name="createName"
                                label="Team Name"
                                value={createName}
                                onChange={(e) => setCreateName(e.target.value)}
                                required
                            />
                            <div className="flex justify-end">
                                <button
                                    className="btn btn-primary"
                                    onClick={onCreate}
                                    disabled={!createName.trim() || submitting}
                                >
                                    {submitting && <span className="loading loading-spinner loading-sm" />}
                                    Create
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-2xl font-semibold text-center">Join a Team</div>
                            <Dropdown
                                name="joinName"
                                label="Team Name"
                                options={groupSetOptions}
                                value={joinName}
                                onChange={(e) => setJoinName(e.target.value)}
                                required
                            />
                            <div className="flex justify-end">
                                <button
                                    className="btn btn-primary"
                                    onClick={onJoin}
                                    disabled={!joinName.trim() || submitting}
                                >
                                    {submitting && <span className="loading loading-spinner loading-sm" />}
                                    Join
                                </button>
                            </div>
                        </>
                    )}
                    </>
                    )}
                </div>
                </div>
            </div>
        </>
    );
}
