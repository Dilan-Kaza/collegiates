"use client";

import { MtHeader, GroupsetList } from "@components";
import { useNavigate } from "@/routerCompat";
import { useForwardIfNotOrganizer } from "@functions";

export default function OrganizerGroupset() {

    useForwardIfNotOrganizer();
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
                    <GroupsetList />
                </div>
            </div>
        </>
    );
}
