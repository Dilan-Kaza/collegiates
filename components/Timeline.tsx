"use client";

import { Heading } from "./Heading";
import type { SettingsDTO } from "@/lib/api";
// competition timeline

function TimelineSection({ settings = {} }: { settings?: Partial<SettingsDTO> }) {
  const compinfo = settings;

  return (
    <>
      <div className="flex flex-col md:flex-row md:flex-wrap items-center justify-center px-6 md:px-10 gap-10 md:gap-40 md:-ml-[25rem]">
        <div id="left-side" className="w-full md:max-w-[30svw] flex flex-col gap-4">
          <Heading className="!text-2xl md:!text-7xl text-left">
            {compinfo.reg_year} Collegiate Wushu Tournament
          </Heading>
          <h2 className="text-lg md:text-4xl tracking-tighter opacity-80">
            Hosted by {compinfo.host}
          </h2>
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

  const dateToStr = (date: Date | null | undefined) => {
    if (!date) return "TBD";
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const events: Record<string, string> = {
    "Registration Opens": dateToStr(compinfo.early_reg_start),
    "Early Registration Deadline": dateToStr(compinfo.reg_start),
    "Registration Deadline": dateToStr(compinfo.reg_end),
    "Payment & Proof of Enrollment Due": dateToStr(compinfo.due_date),
    "Competition Day": dateToStr(compinfo.comp_date),
  };

  return (
    <>
      {/* Line */}
      <div className="h-auto md:h-[24rem] w-full md:w-4 md:bg-secondary relative">
        {/* Events and Dots */}
        <div className="h-full md:absolute md:-top-12 md:-left-4 flex flex-col gap-4 md:gap-[8%]">
          {Object.entries(events).map(([event, date], index) => (
            <TimelineEntry key={index} eventTitle={event} eventDate={date} />
          ))}
        </div>
      </div>
    </>
  );
}

function TimelineEntry({ eventTitle, eventDate }: { eventTitle: string; eventDate: string }) {
  return (
    <div className="flex items-center gap-10 group">
      {/* Dot */}
      <div
        className="flex-shrink-0 h-12 w-12 rounded-full bg-secondary
        group-hover:scale-110 group-hover:bg-primary group-hover:shadow-[0px_0px_30px_6px_rgba(82,110,255,1)]
        transition ease-in duration-2s hidden md:block"
      />

      <div className="flex-shrink-0 w-full md:w-auto">
        {/* Timeline Event */}
        <div
          className="bg-off-white py-4 px-6 md:pr-10 md:pl-8 rounded-lg text-sm md:text-2xl
          w-full md:min-w-[24rem] tracking-tighter border border-brown/50
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
