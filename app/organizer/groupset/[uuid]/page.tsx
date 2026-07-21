"use client";

import { MtHeader, OrganizerFindUser } from "@components";
import { fetchOrganizerGroupset, useForwardIfNotOrganizer } from "@functions";
import { useSession } from "@functions/sessionContext";
import { setErrorMsg } from "@slices";
import { clearSessionCache } from "@functions/sessionCache";
import { updateOrganizerGroupset } from "@functions/actions";
import { useParams, useNavigate } from "@/routerCompat";
import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import type { OrganizerGroupsetDTO, OrganizerMemberDTO } from "@/lib/api";
// organizer groupset detail/edit page

export default function OrganizerGroupsetDetail() {

    useForwardIfNotOrganizer();
    const uuid = useParams().uuid as string;
    const nav = useNavigate();
    const dispatch = useDispatch();
    const { status } = useSession();

    const [groupset, setGroupset] = useState<Partial<OrganizerGroupsetDTO>>({});
    const [editing, setEditing] = useState(false);
    const [teamName, setTeamName] = useState("");
    const [leaderId, setLeaderId] = useState("");
    const [members, setMembers] = useState<OrganizerMemberDTO[]>([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(() => {
        if (!uuid) return;
        fetchOrganizerGroupset(uuid).then(setGroupset);
    }, [uuid]);

    useEffect(() => { load(); }, [load, status]);

    useEffect(() => {
        if (groupset && Object.keys(groupset).length > 0) {
            setTeamName(groupset.team_name ?? "");
            setLeaderId(groupset.leader?.user_id ?? "");
            setMembers(groupset.members ?? []);
        }
    }, [groupset]);

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
        const { error } = await updateOrganizerGroupset(uuid, {
            team_name: teamName,
            leader: leaderId,
            school: groupset.school?.school_id,
            members: members.map(m => m.user_id),
        });
        if (error) {
            dispatch(setErrorMsg(error.detail ?? "Failed to save"));
        } else {
            clearSessionCache(`groupset_${uuid}`);
            clearSessionCache("organizerGroupsets");
            load();
            setEditing(false);
        }
        setLoading(false);
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
                        {groupset.school && (
                            <div className="text-sm text-gray-400">{groupset.school.school_name}</div>
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
                        <div className="text-3xl text-secondary font-semibold">{groupset.team_name ?? "Group Set"}</div>
                        {groupset.school && (
                            <div className="text-sm text-gray-400">{groupset.school.school_name}</div>
                        )}
                        <div className="cg-card-bordered">
                            <div className="text-xl font-semibold text-primary border-b border-gray-200 pb-2">Members</div>
                            {(groupset.members?.length ?? 0) > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {groupset.members?.map((m) => (
                                        <div key={m.user_id} className="flex items-center gap-2 text-sm text-dark">
                                            <span>{m.name}</span>
                                            {m.user_id === groupset.leader?.user_id && <span className="text-secondary text-xs">(leader)</span>}
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
