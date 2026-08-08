"use client";

import { MtHeader, OrganizerFindUser } from "@components";
import { setErrorMsg, setSuccessMsg } from "@slices";
import { clearSessionCache } from "@functions/sessionCache";
import { updateOrganizerGroupset } from "@functions/actions";
import { errorMessage, runAction } from "@functions/actionErrors";
import { useCachedResource, cacheKeys, fetchOrganizerGroupset } from "@functions";
import { useNavigate } from "@/routerCompat";
import { useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import type { OrganizerGroupsetDTO, OrganizerMemberDTO } from "@/lib/api";
// organizer groupset detail/edit page

// The group set arrives from the server by uuid. A save applies what
// updateOrganizerGroupset returns rather than re-running the page.
//
// The edit fields are seeded from the server copy once, at mount. They used to be
// re-synced from an effect keyed on the `groupset` prop, which meant every RSC
// re-render of this route — a server action's updateTag, a router.refresh —
// silently threw away an in-progress rename or roster change. The page keys this
// component on the uuid, so navigating to a different group set still remounts.
export default function GroupsetDetail({
    uuid,
    groupset,
}: {
    uuid: string;
    groupset: OrganizerGroupsetDTO;
}) {

    const nav = useNavigate();
    const dispatch = useAppDispatch();

    // Read-only view of the group set, kept in step with its cache entry.
    const server = useCachedResource(
        cacheKeys.organizerGroupset(uuid),
        () => fetchOrganizerGroupset(uuid),
        groupset,
    );

    // The displayed group set: the server's copy until a save replaces it.
    const [saved, setSaved] = useState<OrganizerGroupsetDTO | null>(null);
    const current = saved ?? server ?? groupset;

    const [editing, setEditing] = useState(false);
    const [teamName, setTeamName] = useState(groupset.team_name ?? "");
    const [leaderId, setLeaderId] = useState(groupset.leader?.user_id ?? "");
    const [members, setMembers] = useState<OrganizerMemberDTO[]>(groupset.members ?? []);
    const [loading, setLoading] = useState(false);

    const handleAdd = (user_id: string, name: string) => {
        if (members.some(m => m.user_id === user_id)) return;
        setMembers(prev => [...prev, { user_id, name }]);
    };

    const handleRemove = (user_id: string) => {
        if (leaderId === user_id) setLeaderId("");
        setMembers(prev => prev.filter(m => m.user_id !== user_id));
    };

    const handleSave = async () => {
        setLoading(true);
        const fallback = "Failed to save";
        try {
            const { data, error } = await runAction(
                () => updateOrganizerGroupset(uuid, {
                    team_name: teamName,
                    leader: leaderId,
                    school: current.school?.school_id,
                    members: members.map(m => m.user_id),
                }),
                fallback,
            );
            if (error || !data) {
                // The action reports roster problems under `groupset`, not
                // `detail`, so reading only `detail` lost them.
                dispatch(setErrorMsg(errorMessage(error, fallback)));
                // Stay in edit mode: the pending changes are still unsaved.
                return;
            }
            clearSessionCache(cacheKeys.organizerGroupset(uuid));
            clearSessionCache(cacheKeys.organizerGroupsets);
            setEditing(false);
            // The action returns the saved group set, so adopt it directly.
            setSaved(data);
            setTeamName(data.team_name ?? "");
            setLeaderId(data.leader?.user_id ?? "");
            setMembers(data.members ?? []);
            dispatch(setSuccessMsg("Group set saved"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="hidden md:block"><MtHeader /></div>
            <div className="min-h-screen bg-off-white max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-6 rounded-2xl">
                <div className="flex items-center justify-between">
                    <button className="btn btn-ghost w-fit" onClick={() => nav("/organizer/groupset")}>← Back</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(e => !e)}>
                        {editing ? "Cancel" : "Edit"}
                    </button>
                </div>

                {editing ? (
                    <>
                        <input
                            className="border border-gray-300 rounded-md px-3 py-2 text-2xl font-semibold focus:outline-primary"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="Team Name"
                        />
                        {current.school && (
                            <div className="text-sm text-gray-400">{current.school.school_name}</div>
                        )}
                        <div className="cg-card-bordered">
                            <div className="text-xl font-semibold text-primary border-b border-gray-200 pb-2">Members</div>
                            {members.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {members.map((m) => (
                                        <div key={m.user_id} className="flex items-center gap-3 text-sm text-dark">
                                            <input
                                                type="radio"
                                                name="leader"
                                                value={m.user_id}
                                                checked={leaderId === m.user_id}
                                                onChange={() => setLeaderId(m.user_id)}
                                            />
                                            <span className="flex-1">{m.name}</span>
                                            {leaderId === m.user_id && <span className="text-secondary text-xs">(leader)</span>}
                                            <button className="text-xs text-red-400 hover:underline" onClick={() => handleRemove(m.user_id)}>Remove</button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-gray-400">No members.</div>
                            )}
                            <div className="border-t border-gray-200 pt-3">
                                <OrganizerFindUser onFound={handleAdd} />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                                {loading ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-3xl text-secondary font-semibold">{current.team_name ?? "Group Set"}</div>
                        {current.school && (
                            <div className="text-sm text-gray-400">{current.school.school_name}</div>
                        )}
                        <div className="cg-card-bordered">
                            <div className="text-xl font-semibold text-primary border-b border-gray-200 pb-2">Members</div>
                            {(current.members?.length ?? 0) > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {current.members?.map((m) => (
                                        <div key={m.user_id} className="flex items-center gap-2 text-sm text-dark">
                                            <span>{m.name}</span>
                                            {m.user_id === current.leader?.user_id && <span className="text-secondary text-xs">(leader)</span>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-gray-400">No members.</div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
