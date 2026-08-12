import { MtHeader, CardCarousel } from "@components";
import {
  OfficialRules,
  Eligibility,
  Awards,
  SkillLevel,
  AllAround,
  TeamCompetition,
  GroupSetRules,
  AllIndividual,
  NanduIndividual,
  GeneralFormat,
  Arbitration,
  Disqualification,
} from "./_components";

const rules = [
  { id: "official-rules",    title: "Official Rule Sets",         content: <OfficialRules /> },
  { id: "eligibility",       title: "1. Eligibility",             content: <Eligibility /> },
  { id: "awards",            title: "2. Awards",                  content: <Awards /> },
  { id: "skill-level",       title: "3. Skill Level",             content: <SkillLevel /> },
  { id: "all-around",        title: "4. All-Around Champions",    content: <AllAround /> },
  { id: "team",              title: "5. Team Competition",        content: <TeamCompetition /> },
  { id: "group-set",         title: "6. Group Set Event",         content: <GroupSetRules /> },
  { id: "individual",        title: "7. All Individual Events",   content: <AllIndividual /> },
  { id: "nandu",             title: "8. Nandu Individual Events", content: <NanduIndividual /> },
  { id: "format",            title: "9. General Format",          content: <GeneralFormat /> },
  { id: "arbitration",       title: "10. Arbitration",            content: <Arbitration /> },
  { id: "disqualification",  title: "11. Disqualification",       content: <Disqualification /> },
];

// `?section=<id>` opens straight to one rule, so pages that ask a competitor to
// self-report something rule-bound (profile setup) can link to the rule itself.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const { section } = await searchParams;
  const initialId = Array.isArray(section) ? section[0] : section;

  return (
    // Exactly the viewport minus the layout's own chrome, so the document never
    // scrolls and the card's internal scroll is the only scrollbar on the page.
    <div className="h-[calc(100dvh-var(--cg-layout-chrome))] flex flex-col">
      <div className="hidden sm:block shrink-0"><MtHeader /></div>
      <CardCarousel cards={rules} initialId={initialId} />
    </div>
  );
}
