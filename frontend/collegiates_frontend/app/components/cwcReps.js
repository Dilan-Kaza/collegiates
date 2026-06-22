"use client";

import Image from "next/image";
import { Heading } from "./heading";
import { useState } from "react";

function CWCRepsSection() {
  return (
    <>
      <div className="flex flex-col items-center justify-center relative">
        <Heading className="!text-3xl text-primary">CWC</Heading>
        <Heading className="-mt-8 !text-7xl max-w-[50rem]">
          The Collegiate Wushu Committee
        </Heading>
        <div className="tracking-tighter text-3xl mb-10 opacity-80">
          With voting representatives from
        </div>
        <CWCRepGrid />
      </div>
    </>
  );
}

function CWCRep({ college, pad }) {
  return (
    <>
      <div className="h-[8rem] w-[15rem] relative">
        <Image
          alt="CWC Rep"
          src={`/cwc_reps/${college}.png`}
          fill={true}
          className={`object-contain ${pad}`}
        />
      </div>
    </>
  );
}

function CWCRepGrid() {
  const colleges = [
    "Columbia",
    "Stanford",
    "UC_Berkeley",
    "UC_Irvine",
    "UCLA",
    "UCSD",
    "UMD",
    "U_Of_Oregon",
    "Pitt",
    "U_Of_Washington",
    "UVA",
  ];

  const [idx, setIdx] = useState([0, 1, 2, 3, 4, 5]);
  return (
    <div>
      <div className="grid grid-cols-3 gap-y-6 gap-x-24">
        {idx.map((idx, i) => (
          <div
            key={`${i}`}
            className="fade"
            style={{
              animationDelay: `${120 * i}ms`,
            }}
            onAnimationIteration={(e) => {
              setIdx((oldIdx) =>
                oldIdx.map((val, j) =>
                  i === j ? (val + 6) % colleges.length : val
                )
              );
            }}
          >
            <CWCRep college={colleges[idx]} />
          </div>
        ))}
      </div>
    </div>
  );
}

export { CWCRepsSection as CWCReps };
