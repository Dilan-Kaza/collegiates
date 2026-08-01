"use client";

import Image from "next/image";

function ImgHeader() {
    return (

        <div className="min-h-24 max-h-24 overflow-hidden">
            <Image src="/test_img_4.png" alt="" width={1198} height={657} className="w-full" />
        </div>
    );
}

function MtHeader(){
    return (
        <div className="min-h-24 max-h-24"></div>
    )
}


export { ImgHeader, MtHeader };
