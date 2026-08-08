"use client";

import { useState } from "react";
import { Dropdown, OrganizerFindUser } from "@components";
import { createOrganizerGroupset } from "@functions/actions";
import { confirmMessage, errorMessage, runAction } from "@functions/actionErrors";
import { clearSessionCache } from "@functions/sessionCache";
import { cacheKeys } from "@functions";
import { useAppDispatch } from "@/store/hooks";
import { setErrorMsg, setSuccessMsg } from "@slices";
import { useNavigate } from "@/routerCompat";
import type { OrganizerMemberDTO } from "@/lib/api";
// organizer group-set create form

// Organizer path for entering a team on competitors' behalf — a paper roster, a member who
// can't reach their account. createOrganizerGroupset enforces eligibility; see memberProblems.
export default function GroupsetCreate({ colleges = {} }: { colleges?: Record<string, string> }) {

    const nav = useNavigate();
    const dispatch = useAppDispatch();

    const [open, setOpen] = useState(false);
    const [teamName, setTeamName] = useState("");
    const [school, setSchool] = useState("");
    const [members, setMembers] = useState<OrganizerMemberDTO[]>([]);
    const [leaderId, setLeaderId] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    const reset = () => {
        setTeamName("");
        setSchool("");
        setMembers([]);
        setLeaderId("");
        setConfirm("");
    };

    // Any roster change invalidates a pending confirmation: it was about the roster
    // as it stood, and silently carrying it over would write an unconfirmed one.
    const handleAdd = (user_id: string, name: string) => {
        if (members.some((m) => m.user_id === user_id)) return;
        setConfirm("");
        setMembers((prev) => [...prev, { user_id, name }]);
    };

    const handleRemove = (user_id: string) => {
        if (leaderId === user_id) setLeaderId("");
        setConfirm("");
        setMembers((prev) => prev.filter((m) => m.user_id !== user_id));
    };

    const handleCreate = async (override = false) => {
        setLoading(true);
        const fallback = "Could not create the group set.";
        try {
            const { data, error } = await runAction(
                () => createOrganizerGroupset({
                    team_name: teamName,
                    school,
                    leader: leaderId,
                    members: members.map((m) => m.user_id),
                    override,
                }),
                fallback,
            );
            if (error || !data) {
                const needsConfirm = confirmMessage(error);
                if (needsConfirm) {
                    setConfirm(needsConfirm);
                    return;
                }
                // Roster and name problems come back keyed `groupset`, not `detail`.
                dispatch(setErrorMsg(errorMessage(error, fallback)));
                return;
            }
            // The new team belongs in the list this page reads, and on the dashboard.
            clearSessionCache(cacheKeys.organizerGroupsets);
            reset();
            setOpen(false);
            dispatch(setSuccessMsg("Group set created"));
            // Straight to the new team, so its roster can be checked or corrected.
            nav(`/organizer/groupset/${data.groupset_id}`);
        } finally {
            setLoading(false);
        }
    };

    if (!open) {
        return (
            <button className="btn btn-secondary btn-sm w-fit" onClick={() => setOpen(true)}>
                + New Group Set
            </button>
        );
    }

    return (
        <div className="cg-card-bordered flex flex-col gap-3">
            <div className="text-xl font-semibold text-primary border-b border-gray-200 pb-2">New Group Set</div>
            <input
                className="border border-gray-300 rounded-md px-3 py-2 text-lg font-medium focus:outline-primary"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team Name"
            />
            <Dropdown
                name="school"
                label="College"
                options={colleges}
                value={school}
                onChange={(e) => { setConfirm(""); setSchool(e.target.value); }}
            />

            <div className="border-t border-gray-200 pt-3 flex flex-col gap-2">
                <div className="text-sm font-medium text-dark">Members</div>
                {members.length > 0 ? (
                    members.map((m) => (
                        <div key={m.user_id} className="flex items-center gap-3 text-sm text-dark">
                            <input
                                type="radio"
                                name="new-groupset-leader"
                                value={m.user_id}
                                checked={leaderId === m.user_id}
                                onChange={() => setLeaderId(m.user_id)}
                            />
                            <span className="flex-1">{m.name}</span>
                            {leaderId === m.user_id && <span className="text-secondary text-xs">(leader)</span>}
                            <button className="text-xs text-red-400 hover:underline" onClick={() => handleRemove(m.user_id)}>Remove</button>
                        </div>
                    ))
                ) : (
                    <div className="text-sm text-gray-400">No members yet.</div>
                )}
                <OrganizerFindUser onFound={handleAdd} />
            </div>

            {confirm && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex flex-col gap-2">
                    <span>{confirm}</span>
                    <span className="text-xs text-amber-700">Create anyway?</span>
                </div>
            )}

            <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { reset(); setOpen(false); }}
                    disabled={loading}
                >
                    Cancel
                </button>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleCreate(!!confirm)}
                    disabled={loading || !teamName.trim() || !school}
                >
                    {loading ? "Creating..." : confirm ? "Create anyway" : "Create"}
                </button>
            </div>
        </div>
    );
}
