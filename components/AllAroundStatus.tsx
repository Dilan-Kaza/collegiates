"use client";

import { canCompeteForAllAround, allAroundProgress } from "@/lib/allAround";
import type { AllAroundEvent } from "@/lib/allAround";

interface AllAroundStatusProps {
  // Every event in play — being picked in registration, or already registered on the dashboard.
  // EventDTO and RegistrationDTO both fit AllAroundEvent, so either can pass straight through.
  events: AllAroundEvent[];
  studentType?: string | null;
  skillLevel?: string | null;
  // The confirm screen sits on the primary background, so it swaps the default
  // bordered card for a surface of its own.
  className?: string;
}

// Renders nothing unless the competitor could hold a title and is working toward one: a profile
// that can't qualify shouldn't hear about the race, nor an empty picker show a row of zeros.
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
            {/* The rules' numbered requirements, in their order — a bare count
                can't say which form is still missing, which is the one thing a
                competitor mid-registration can act on. */}
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
