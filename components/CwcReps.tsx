"use client";

import { Heading } from "./Heading";
import { useState } from "react";

function CWCRepsSection() {
  return (
    <>
      <div className="flex flex-col items-center justify-center relative">
        <Heading className="!text-xl md:!text-3xl text-primary">CWC</Heading>
        <Heading className="-mt-8 !text-2xl md:!text-7xl max-w-[50rem]">
          The Collegiate Wushu Committee
        </Heading>
        <div className="tracking-tighter text-l md:text-3xl mb-10 opacity-80">
          With voting representatives from
        </div>
        <CWCRepGrid />
      </div>
    </>
  );
}

function CWCRep({ college, pad }: { college: string; pad?: string }) {
  return (
    <>
      <div className="h-[4rem] w-full md:h-[8rem] md:w-[15rem] relative">
        <img
          alt="CWC Rep"
          src={`/cwc_reps/${college}.png`}
          className={`object-contain ${pad ?? ""} w-full h-full`}
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

  const [idx, setIdx] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  return (
    <div>
      <div className="grid grid-cols-3 gap-4 md:gap-y-6 md:gap-x-24">
        {idx.map((idx, i) => (
          <div
            key={`${i}`}
            className="fade"
            style={{
              animationDelay: `${120 * i}ms`,
            }}
            onAnimationIteration={() => {
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
