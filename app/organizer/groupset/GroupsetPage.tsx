"use client";

import { MtHeader, GroupsetList } from "@components";
import { useNavigate } from "@/routerCompat";
import type { OrganizerGroupsetDTO } from "@/lib/api";

// The group set list is resolved on the server and passed in; this client
// component only owns the back-navigation UI.
export default function GroupsetPage({ groupsets = [] }: { groupsets?: OrganizerGroupsetDTO[] }) {

    const nav = useNavigate();

    return (
        <>
            <div className="hidden md:block"><MtHeader /></div>
            <div className="max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <button className="btn btn-primary btn-sm" onClick={() => nav("/organizer")}>← Back</button>
                    <div className="text-3xl text-secondary font-semibold">Group Sets</div>
                </div>
                <div className="cg-card">
                    <GroupsetList groupsets={groupsets} />
                </div>
            </div>
        </>
    );
}
