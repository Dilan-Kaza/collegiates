"use client";

import { Heading } from "./Heading";
import { Link } from "@/routerCompat";
import { formatSettingsDate } from "@/lib/dates";
import type { SettingsDateField } from "@/lib/dates";
import type { SettingsDTO } from "@/lib/api";
// competition timeline

function TimelineSection({ settings = {} }: { settings?: Partial<SettingsDTO> }) {
  const compinfo = settings;

  return (
    <>
      {/* The timeline column sizes itself now that its entries are in normal
          flow, so the two columns just centre — no negative margin to undo an
          overflowing absolute layout. */}
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:flex-wrap items-center justify-center px-6 md:px-10 gap-10 md:gap-20">
        <div id="left-side" className="w-full md:max-w-[30svw] flex flex-col gap-4">
          <Heading className="!text-2xl md:!text-7xl text-left">
            {compinfo.reg_year} Collegiate Wushu Tournament
          </Heading>
          <h2 className="text-lg md:text-4xl tracking-tighter opacity-80">
            Hosted by {compinfo.host_school ?? "TBD"}
          </h2>
          {compinfo.reg_open && (
            // Registration starts at the profile (gender, level and class decide
            // event eligibility) and continues to event selection from there, so
            // this entry point matches the dashboard's Register button.
            <Link
              to="/competitor/profile"
              className="w-fit text-lg md:text-3xl font-bold underline underline-offset-4 hover:opacity-70 transition"
            >
              Register Now →
            </Link>
          )}
        </div>

        <div id="center">
          <Timeline settings={compinfo} />
        </div>
      </div>
    </>
  );
}

function Timeline({ settings = {} }: { settings?: Partial<SettingsDTO> }) {
  const compinfo = settings;

  // Dates are shown on the competition's clock (Pacific), not the reader's.
  const dateToStr = (field: SettingsDateField, date: Date | null | undefined) =>
    formatSettingsDate(field, date, undefined, "TBD");

  const events: Record<string, string> = {
    "Registration Opens": dateToStr("early_reg_start", compinfo.early_reg_start),
    "Early Registration Deadline": dateToStr("reg_start", compinfo.reg_start),
    "Registration Deadline": dateToStr("reg_end", compinfo.reg_end),
    "Payment & Proof of Enrollment Due": dateToStr("due_date", compinfo.due_date),
    "Competition Day": dateToStr("comp_date", compinfo.comp_date),
  };

  return (
    <>
      {/* gap-10 (2.5rem) is what each entry's connector adds to its own height
          to reach the next dot — keep the two in step. */}
      <div className="w-full md:w-auto flex flex-col gap-4 md:gap-10">
        {/* Events and Dots */}
        {Object.entries(events).map(([event, date], index, all) => (
          <TimelineEntry
            key={index}
            eventTitle={event}
            eventDate={date}
            isLast={index === all.length - 1}
          />
        ))}
      </div>
    </>
  );
}

function TimelineEntry({
  eventTitle,
  eventDate,
  isLast = false,
}: {
  eventTitle: string;
  eventDate: string;
  isLast?: boolean;
}) {
  return (
    <div className="relative flex items-center gap-10 group">
      {/* Connector: from this dot's centre down to the next one's — its own
          height plus the flex gap. Drawn before the dot so the dot, which is
          positioned too, paints over it on hover. */}
      {!isLast && (
        <div className="hidden md:block absolute left-4 top-1/2 h-[calc(100%+2.5rem)] w-4 bg-secondary" />
      )}

      {/* Dot */}
      <div
        className="relative flex-shrink-0 h-12 w-12 rounded-full bg-secondary
        group-hover:scale-110 group-hover:bg-primary group-hover:shadow-[0px_0px_30px_6px_rgba(82,110,255,1)]
        transition ease-in duration-2s hidden md:block"
      />

      <div className="flex-shrink-0 w-full md:w-auto">
        {/* Timeline Event */}
        {/* Fixed size at md, not min-w: every box matches, whatever the length
            of its label. Wide enough that no title wraps, so the heights agree
            too — the flex centring keeps the two lines put. */}
        <div
          className="bg-off-white py-4 px-6 md:pr-10 md:pl-8 rounded-lg text-sm md:text-2xl
          w-full md:w-[28rem] md:h-28 md:flex md:flex-col md:justify-center
          tracking-tighter border border-brown/50
          group-hover:shadow-[0px_0px_14px_4px_rgba(190,188,187,.4)] group-hover:border-transparent group-hover:outline-solid
          transition ease-in duration-2s"
        >
          <h3>{eventTitle}</h3>
          <h3 className="font-bold">{eventDate}</h3>
        </div>
      </div>
    </div>
  );
}

export { TimelineSection as Timeline };
