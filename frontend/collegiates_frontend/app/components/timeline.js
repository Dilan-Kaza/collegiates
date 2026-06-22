import { Heading } from "./heading";

function TimelineSection() {
  const collegiatesNum = 26;
  const hostSchool = "University of Maryland, College Park";
  return (
    <>
      <div className="flex flex-wrap items-center mx-10 justify-center gap-40 -ml-[25rem]">
        <div id="left-side" className="flex flex-col max-w-[30svw] gap-4">
          <Heading className="!text-7xl text-left">
            {collegiatesNum}th Annual Collegiate Wushu Tournament
          </Heading>
          <h2 className="text-4xl tracking-tighter opacity-80">
            Hosted by {hostSchool}
          </h2>
        </div>

        <div id="center">
          <Timeline />
        </div>
      </div>
    </>
  );
}

function Timeline() {
  const events = {
    "Registration Opens": "Feburary 8, 2025",
    "Early Registration": "March 8, 2025",
    "Competitor Documentation": "March 8, 2025",
    "Registration Fee Deadline": "8 AM on Competition Day",
  };

  return (
    <>
      {/* Line */}
      <div className="h-[24rem] w-4 bg-secondary relative">
        {/* Events and Dots */}
        <div className="h-full absolute -top-12 -left-4 flex flex-col gap-[8%]">
          {Object.entries(events).map(([event, date], index) => (
            <TimelineEntry key={index} eventTitle={event} eventDate={date} />
          ))}
        </div>
      </div>
    </>
  );
}

function TimelineEntry({ eventTitle, eventDate }) {
  return (
    <div className="flex items-center gap-10 group">
      {/* Dot */}
      <div
        className="flex-shrink-0 h-12 w-12 rounded-full bg-secondary 
        group-hover:scale-110 group-hover:bg-primary group-hover:shadow-[0px_0px_30px_6px_rgba(82,110,255,1)]
        transition ease-in duration-2s"
      />

      <div className="flex-shrink-0">
        {/* Timeline Event */}
        <div
          className="bg-off-white py-4 pr-10 pl-8 rounded-lg text-2xl
        min-w-[24rem] tracking-tighter border border-brown/50
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
