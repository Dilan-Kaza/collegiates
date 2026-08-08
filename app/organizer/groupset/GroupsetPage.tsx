"use client";

import { MtHeader, GroupsetList } from "@components";
import { useNavigate } from "@/routerCompat";
import { useCachedResource, cacheKeys, fetchOrganizerGroupsets } from "@functions";
import type { OrganizerGroupsetDTO } from "@/lib/api";

// The group set list is resolved on the server and passed in; this client
// component only owns the back-navigation UI.
export default function GroupsetPage({
    groupsets: initialGroupsets = [],
}: {
    groupsets?: OrganizerGroupsetDTO[];
}) {

    const nav = useNavigate();

    // Detail pages under this route save through updateOrganizerGroupset and
    // drop this key, so coming back here shows the rename rather than the list
    // as it was when this page last rendered.
    const groupsets = useCachedResource(
        cacheKeys.organizerGroupsets,
        fetchOrganizerGroupsets,
        initialGroupsets,
    );

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
