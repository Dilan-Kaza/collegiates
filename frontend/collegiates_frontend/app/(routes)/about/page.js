import { CWCReps } from "@/app/components/cwcReps";

export default function About() {
  return (
    <>
      <div className="flex-col  bg-primary text-off-white">
        <div className="content-center w-full max-w-8/10 translate-x-1/10">
          <div>&nbsp;</div>
          <header className="flex items-center text-6xl animate-fadeIn">ABOUT</header>
          <div>&nbsp;</div>
          <div className="text-2xl">Wushu</div>
          <div>&nbsp;</div>
          <div>The term <a className="font-bold">Wushu</a> encompasses all of Chinese martial arts, which is composed of an enormous range of martial styles and philosophies.
              While Wushu has developed sophisticated systems over its 2000 year history, it has recently gained international appeal in its "contemporary" form.
                Contemporary Wushu refers to a conglomerate of many traditional styles and their transformation into a competitive sport with standardized rules and judging.
                  A more thorough definition can be found at wikipedia: (<a href="http://en.wikipedia.org/wiki/Wushu" className="underline text-secondary">http://en.wikipedia.org/wiki/Wushu</a>).</div>
          <div>&nbsp;</div>
          <div className="text-2xl">Collegiate Wushu</div>
          <div>&nbsp;</div>
          <div>The Annual Collegiate Wushu Tournament was created to foster collegiate-level wushu in the nation. The first tournament was hosted by the University of Oregon in 1997, organized by Brandon Sugiyama. Today, the tournament draws in competitors from universities all across the country and has been hosted on both the east and west coasts.</div>
          <div>&nbsp;</div>
          <div className="text-2xl">Collegiate Wushu</div>
          <div>&nbsp;</div>
          <div className="translate-x-4"><a href="http://jiayoowushu.com/collegiate-wushu-usa/" className="underline text-secondary">Collegiate Wushu in the United States: What it Means for US Wushu</a> by Matthew Lee</div>
          <div className="translate-x-4"><a href="http://www.beijingwushuteam.com/collegiates/history.html" className="underline text-secondary">Collegiate Wushu History 101</a> by Raffi</div>
          <div className="translate-x-4"><a href="http://www.beijingwushuteam.com/articles/collegiates2000.html" className="underline text-secondary">Collegiates 2000</a> by Raffi</div>
          <div className="translate-x-4"><a href="http://www.beijingwushuteam.com/articles/collegiates1999.html" className="underline text-secondary">The 1999 Collegiates and Magic Mountain Experience!</a> by Raffi</div>
          <div>&nbsp;</div>
        </div>
      </div>
      <div className="flex-col  bg-off-white text-primary">
        <div className="content-center w-full max-w-8/10 translate-x-1/10">
          <div>&nbsp;</div>
          <header className="flex items-center text-6xl animate-fadeIn">CWCMembers</header>
          <div>&nbsp;</div>
          <div>The Collegiate Wushu Committee (CWC) currently consists of one voting representative from each of the following universities:</div>
          <div>&nbsp;</div>
          <div className="translate-x-4">1. Columbia University</div>
          <div className="translate-x-4">2. Stanford University</div>
          <div className="translate-x-4">3. University of California, Berkeley</div>
          <div className="translate-x-4">4. University of California, Irvine</div>
          <div className="translate-x-4">5. University of California, Los Angeles</div>
          <div className="translate-x-4">6. University of California, San Diego</div>
          <div className="translate-x-4">7. University of Maryland, College Park</div>
          <div className="translate-x-4">8. University of Oregon</div>
          <div className="translate-x-4">9. University of Pittsburgh</div>
          <div className="translate-x-4">10. University of Virginia</div>
          <div className="translate-x-4">11. niversity of Washington</div>
          <div>&nbsp;</div>
          <div>The CWC also includes alumni members serving as advisers.</div>
          <div>&nbsp;</div>
          <div>Each year, a call is made to clubs for the position of host, and bids are voted on by the Collegiate Wushu Committee voting members. The CWC is composed of advisers and school representatives, with each school on the CWC posessing one voting representative. The CWC also discusses and votes on changes to tournament rules such as competitor eligiblity requirements and experience level determination. Once a school has hosted a Collegiate Wushu Tournament, they will receive an invitation to join the CWC.</div>
          <div>&nbsp;</div>
        </div>
      </div>
      <div className="flex-col  bg-primary text-off-white">
        <div className="content-center w-full max-w-8/10 translate-x-1/10">
          <div>&nbsp;</div>
          <header className="flex items-center text-6xl animate-fadeIn">Previous Hosts</header>
          <div>&nbsp;</div>
        </div>
      </div>
      <div className="bg-off-white">
        <CWCReps/>
      </div>
    </>
  );
}
