"use client";

import { Link } from "@/routerCompat";
import type { OrganizerGroupsetDTO } from "@/lib/api";
// organizer groupset list

// `groupsets` is resolved on the server and passed in (was fetched on mount).
export default function GroupsetList({ groupsets = [] }: { groupsets?: OrganizerGroupsetDTO[] }) {

    return (
        <>
            {groupsets.length === 0 ? (
                <div className="text-sm text-gray-400">No group sets found.</div>
            ) : (
                <div className="flex flex-col gap-3">
                    {groupsets.map((gs) => (
                        <Link key={gs.groupset_id} to={`/organizer/groupset/${gs.groupset_id}`} className="cg-list-row hover:bg-gray-50 transition-colors">
                            <div className="font-medium text-dark">{gs.team_name}</div>
                            {gs.school?.school_name && (
                                <div className="text-sm text-gray-400">{gs.school.school_name}</div>
                            )}
                            {gs.members?.length > 0 && (
                                <div className="mt-2 flex flex-col gap-1">
                                    {gs.members.map((m) => (
                                        <div key={m.user_id} className="text-sm text-gray-500">
                                            {m.name}{m.user_id === gs.leader?.user_id && <span className="text-secondary"> ★</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </>
    );
}
