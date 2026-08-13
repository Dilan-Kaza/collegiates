"use client";

import { canCompeteForAllAround, allAroundProgress } from "@/lib/allAround";
import type { AllAroundEvent } from "@/lib/allAround";

interface AllAroundStatusProps {
  /**
   * Every event in play — being picked during registration, or already
   * registered on the dashboard. `EventDTO` and `RegistrationDTO` both satisfy
   * `AllAroundEvent`, so either passes straight through.
   */
  events: AllAroundEvent[];
  studentType?: string | null;
  skillLevel?: string | null;
  /**
   * Surface classes. The confirm screen sits on the primary background, so it
   * swaps the default bordered card for a surface of its own.
   */
  className?: string;
}

/**
 * A competitor's progress toward the All-Around titles.
 *
 * @remarks
 * Renders **nothing** in two cases: a profile that could never qualify (not
 * Class 1 and advanced), and a competitor not yet working toward any title. A
 * competitor who cannot enter the race should not hear about it, and an empty
 * picker should not show a row of zeros.
 *
 * The scoring is `allAroundProgress` in {@link "lib/allAround"}; this component
 * only renders it.
 */
export default function AllAroundStatus({
  events,
  studentType,
  skillLevel,
  className = "cg-list-row",
}: AllAroundStatusProps) {
  if (!canCompeteForAllAround(studentType, skillLevel)) return null;

  const progress = allAroundProgress(events);
  if (progress.length === 0) return null;

  const eligibleCount = progress.filter((title) => title.eligible).length;

  return (
    <div className={`${className} text-sm`}>
      <div className="flex items-center gap-2">
        <span className="cg-eyebrow">All-Around</span>
        {eligibleCount > 0 && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">
            Eligible
          </span>
        )}
      </div>
      <div className="mt-2 space-y-3">
        {progress.map((title) => (
          <div key={title.key}>
            <div className="flex items-center justify-between gap-3">
              <span className={title.eligible ? "font-semibold text-primary" : "text-gray-500"}>
                {title.title}
              </span>
              <span className={title.eligible ? "font-semibold text-primary" : "text-gray-400"}>
                {title.met} of {title.required}
              </span>
            </div>
            {/* Listed in rules order: a bare count can't say which form is
                missing, the one thing a competitor can act on. */}
            <ul className="mt-1 space-y-0.5 text-xs">
              {title.requirements.map((req, i) => (
                <li key={i} className={req.met ? "text-gray-600" : "text-gray-400"}>
                  <span className={req.met ? "text-primary" : "text-gray-300"}>
                    {req.met ? "✓" : "○"}
                  </span>{" "}
                  {req.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {/* Rules 4.I: one title per tournament, chosen before tournament day — so
          qualifying for both is a choice the competitor still has to make. */}
      {eligibleCount > 1 && (
        <div className="mt-2 text-xs text-gray-500 italic">
          You may only compete for one All-Around title — specify which before tournament day.
        </div>
      )}
    </div>
  );
}
