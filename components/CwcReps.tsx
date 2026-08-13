"use client";

import Image from "next/image";
import { Heading } from "./Heading";
import { useState } from "react";

/**
 * The home page's Collegiate Wushu Committee section: a heading over a rotating
 * grid of member-school logos.
 *
 * @remarks
 * Exported as `CWCReps`.
 */
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

/**
 * One slot of the rotating logo grid.
 *
 * @param college - The logo currently shown.
 * @param upcoming - The logo this slot will show next, rendered invisibly so the
 * browser fetches it a cycle early. Without it the swap starts the download at
 * the moment the logo is meant to appear, and on a phone the slot can stay blank
 * for most of the four-second cycle.
 * @param pad - Extra classes for logos whose artwork needs different padding.
 */
function CWCRep({
  college,
  upcoming,
  pad,
}: {
  college: string;
  upcoming?: string;
  pad?: string;
}) {
  return (
    <>
      <div className="h-[4rem] w-full md:h-[8rem] md:w-[15rem] relative">
        <RepLogo college={college} pad={pad} />
        {upcoming && upcoming !== college && (
          <RepLogo college={upcoming} pad={pad} preload />
        )}
      </div>
    </>
  );
}

/**
 * One school logo from `public/cwc_reps/`.
 *
 * @remarks
 * Deliberately **not** `fill`. `fill` positions the image absolutely, and this
 * slot's ancestor animates `filter` — which makes that ancestor the containing
 * block for absolutely positioned descendants and promotes the subtree to its
 * own composited layer. Mobile browsers paint that combination as an empty box.
 * Laying the logo out in normal flow keeps it independent of how the wrapper is
 * composited.
 *
 * The `width`/`height` are only an aspect-ratio hint for the generated srcset.
 * `object-contain` inside a fixed-size box is what actually determines how the
 * logo draws, so the varying real dimensions of the files do not matter.
 *
 * @param college - The file's base name.
 * @param pad - Extra classes for artwork needing different padding.
 * @param preload - Renders the logo invisible but still fetched, for the next
 * cycle's image. It must stay out of flow so it cannot displace the visible
 * logo, and stay renderable — `display: none` would skip the download entirely.
 */
function RepLogo({
  college,
  pad,
  preload,
}: {
  college: string;
  pad?: string;
  preload?: boolean;
}) {
  return (
    <Image
      alt={preload ? "" : college.replace(/_/g, " ")}
      aria-hidden={preload || undefined}
      src={`/cwc_reps/${college}.png`}
      width={480}
      height={256}
      // Three columns on mobile, so a logo is a third of the viewport: claiming
      // 50vw pushed phones onto the 640w variant when 384w covers a 2x screen.
      sizes="(min-width: 768px) 240px, 33vw"
      className={`h-full w-full object-contain ${pad ?? ""} ${
        preload ? "absolute inset-0 opacity-0" : ""
      }`}
    />
  );
}

/**
 * A six-slot grid cycling through the committee's member schools.
 *
 * @remarks
 * Each slot advances independently, driven by its own CSS fade animation's
 * `animationiteration` event rather than a timer — so the swap always lands
 * while the slot is invisible, and the slots stay in step with the animation
 * even if the tab is throttled. Staggered start delays keep them from all
 * turning over at once.
 */
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
            <CWCRep
              college={colleges[idx]}
              upcoming={colleges[(idx + 6) % colleges.length]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export { CWCRepsSection as CWCReps };
