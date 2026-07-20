"use client";

import { useEffect } from "react";
import { useSession } from "@functions/sessionContext";
import { useSessionCache, setSessionCache } from "@functions/sessionCache";
import { getOrganizerGroupsets, getOrganizerGroupset, getOrganizerRegistrations } from "@functions/actions";
import type { OrganizerGroupsetDTO, OrganizerRegistrationDTO } from "@/lib/api";

function useOrganizerGroupsets(): OrganizerGroupsetDTO[] {

    const { status } = useSession();
    const cached = useSessionCache<OrganizerGroupsetDTO[]>("organizerGroupsets");

    useEffect(() => {
        if (cached?.length) return;
        getOrganizerGroupsets()
            .then((data) => setSessionCache("organizerGroupsets", data))
            .catch((err) => console.warn("Could not fetch organizer groupsets", err));
    }, [status]);

    return cached ?? [];
}

function useOrganizerGroupset(uuid: string): Partial<OrganizerGroupsetDTO> {

    const { status } = useSession();
    const cached = useSessionCache<Partial<OrganizerGroupsetDTO>>(`groupset_${uuid}`);

    useEffect(() => {
        if (!uuid) return;
        if (cached && Object.keys(cached).length > 0) return;
        getOrganizerGroupset(uuid)
            .then((data) => setSessionCache(`groupset_${uuid}`, data ?? {}))
            .catch((err) => console.warn("Could not fetch groupset", err));
    }, [status, uuid, cached]);

    return cached ?? {};
}

function useOrganizerRegistrations(): OrganizerRegistrationDTO[] {
    const { status } = useSession();
    const cached = useSessionCache<OrganizerRegistrationDTO[]>("organizerRegistrations");

    useEffect(() => {
        if (cached?.length) return;
        getOrganizerRegistrations()
            .then((data) => setSessionCache("organizerRegistrations", data))
            .catch((err) => console.warn("Could not fetch organizer registrations", err));
    }, [status]);

    return cached ?? [];
}

export { useOrganizerGroupsets, useOrganizerGroupset, useOrganizerRegistrations };
