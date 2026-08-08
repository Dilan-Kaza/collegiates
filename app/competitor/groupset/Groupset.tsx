"use client";

import { useState } from "react";
import { createGroupset, joinGroupset } from "@functions/actions";
import { errorMessage, runAction } from "@functions/actionErrors";
import { clearSessionCache } from "@functions/sessionCache";
import { useCachedResource, cacheKeys, fetchGroupSet, fetchJoinableGroupsets } from "@functions";
import { useAppDispatch } from "@/store/hooks";
import { setErrorMsg, setSuccessMsg } from "@slices";
import { ShortAnswer, Dropdown, MtHeader } from "@components";
import type { GroupsetDTO } from "@/lib/api";
// competitor groupset create/join page

// Joinable group sets and the competitor's own arrive as initial state from the
// server. After a create/join the component refetches its own to reflect it.
// `classOne` is resolved from the profile's student type on the server; a Class 2
// competitor sees why the team competition is closed to them instead of a form.
export default function Groupset({
    groupSetMembers: initialMembers = [],
    myGroupSet: initialMine = [],
    classOne = false,
}: {
    groupSetMembers?: GroupsetDTO[];
    myGroupSet?: GroupsetDTO[];
    classOne?: boolean;
}){

    const dispatch = useAppDispatch();

    const [mode, setMode] = useState("create");
    const [createName, setCreateName] = useState("");
    const [joinName, setJoinName] = useState("");
    const [submitting, setSubmitting] = useState(false);
    // Shown inline next to the form as well as in the toast: the failures here
    // ("already in a groupset", "groupset is full") are about what was entered.
    const [error, setError] = useState("");

    // The joinable list is school-wide, so a team someone else created shows up
    // here once TAG_GROUPSETS drops the entry rather than only on a full reload.
    const groupSetMembers = useCachedResource(
        cacheKeys.joinableGroupsets,
        fetchJoinableGroupsets,
        initialMembers,
    );
    const cachedMine = useCachedResource(cacheKeys.groupSet, fetchGroupSet, initialMine);

    // create/join return the resulting group set, so it is shown straight from
    // the response instead of waiting on the refetch the clears below trigger.
    const [saved, setSaved] = useState<GroupsetDTO[] | null>(null);
    const myGroupSet = saved ?? cachedMine;

    const groupSetOptions = Object.fromEntries(groupSetMembers.map((g) => [g.team_name, g.groupset_id]));
    const myTeam = myGroupSet?.[0];

    const applyResult = (groupset: GroupsetDTO) => {
        setSaved([groupset]);
        clearSessionCache(cacheKeys.groupSet);
        // The group set is now bundled into getMe, so refresh that cache too —
        // the dashboard reads its team from there.
        clearSessionCache(cacheKeys.currentUser);
        // A new or newly-joined team changes the school's joinable roster.
        clearSessionCache(cacheKeys.joinableGroupsets);
    };

    // createGroupset and joinGroupset report every rejection through { error }
    // (name taken, wrong school, full, already a member); surface it rather than
    // resetting the button and leaving the competitor to guess what happened.
    const submit = async (
        action: () => ReturnType<typeof createGroupset>,
        fallback: string,
        success: string,
    ) => {
        if (submitting) return;
        setSubmitting(true);
        setError("");
        try {
            const { data, error: fieldErrors } = await runAction(action, fallback);
            if (fieldErrors || !data) {
                const message = errorMessage(fieldErrors, fallback);
                setError(message);
                dispatch(setErrorMsg(message));
                return;
            }
            applyResult(data);
            dispatch(setSuccessMsg(success));
        } finally {
            setSubmitting(false);
        }
    };

    const onCreate = () =>
        submit(
            () => createGroupset({ team_name: createName }),
            "Could not create the team.",
            "Team created",
        );

    const onJoin = () =>
        submit(
            () => joinGroupset({ groupset: joinName }),
            "Could not join the team.",
            "Joined the team",
        );

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
                    ) : !classOne ? (
                        <>
                            <div className="text-2xl font-semibold text-center">Team Competition</div>
                            <div className="text-sm text-center text-brown/70">
                                The team competition is open to Class 1 competitors only, and your
                                profile says you are Class 2.
                            </div>
                            <div className="text-sm text-center text-brown/70">
                                If that is not right, update your student type in your profile.
                            </div>
                        </>
                    ) : (
                    <>
                    <div className="flex rounded-lg border border-brown/20 overflow-hidden">
                        <button
                            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "create" ? "bg-primary text-white" : "hover:bg-brown/5"}`}
                            onClick={() => { setMode("create"); setError(""); }}
                        >
                            Create
                        </button>
                        <button
                            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "join" ? "bg-primary text-white" : "hover:bg-brown/5"}`}
                            onClick={() => { setMode("join"); setError(""); }}
                        >
                            Join
                        </button>
                    </div>

                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}

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
