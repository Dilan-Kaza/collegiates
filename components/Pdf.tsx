"use client";

import { MtHeader } from "@components";

export default function Pdf({ src }: { src: string }){
    return (
        <>
            <MtHeader/>
            <iframe src={src} className="h-[85vh] w-full"></iframe>
        </>
    )
}
