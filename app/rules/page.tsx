import { ImgHeader, CardCarousel } from "@components";
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
} from "@components/rules";

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

export default function Page() {
  return (
    <div className="bg-off-white sm:min-h-screen relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] rounded-full border-[3rem] border-primary/60" />
        <div className="absolute -top-24 -left-24 w-[22rem] h-[22rem] rounded-full border-[2.5rem] border-primary/50" />
        <div className="absolute top-[38%] -left-10 w-40 h-40 rounded-full bg-primary/40" />
        <div className="absolute top-16 right-24 w-20 h-20 rounded-full bg-primary/50" />
        <div className="absolute top-[50%] left-[45%] w-10 h-10 rounded-full bg-primary/55" />
        <div className="absolute top-[42%] right-10 w-36 h-36 rounded-full border-[1.5rem] border-secondary/40" />
        <div className="absolute -bottom-10 -left-10 w-[16rem] h-[16rem] rounded-full border-[2rem] border-secondary/25" />
        <div className="absolute top-8 left-[38%] w-8 h-8 rounded-full bg-secondary/50" />
        <div className="absolute bottom-[32%] right-[30%] w-5 h-5 rounded-full bg-secondary/40" />
      </div>
      <div className="relative z-10">
        <div className="hidden sm:block"><ImgHeader /></div>
        <CardCarousel cards={rules} />
        <div className="hidden sm:block px-1 text-primary/20 text-xs pb-2">this page is vibecoded, pls take your complaints to dilan for now</div>
      </div>
    </div>
  );
}
