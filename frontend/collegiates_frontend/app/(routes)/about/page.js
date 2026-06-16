"use client"
import { CWCReps } from "@/app/components/cwcReps";
import { ImgHeader } from "@/app/layouts/headers";
import { UserLayout } from "@/app/layouts/layouts";

export default function About() {
  return (
    <UserLayout header={<ImgHeader/>}>
      <div className="flex-col bg-primary text-off-white py-10">
        <div className="content-center w-full max-w-8/10 translate-x-1/10">
          <div>&nbsp;</div>
          <header className="flex items-center text-6xl animate-fadeIn">ABOUT</header>
          <div>&nbsp;</div>
          <div className="text-2xl">Wushu</div>
          <div>&nbsp;</div>
          <div>The term <a className="font-bold">Wushu</a> encompasses all of Chinese martial arts, which is composed of an enormous range of martial styles and philosophies.
              While Wushu has developed sophisticated systems over its 2000 year history, it has recently gained international appeal in its "contemporary" form.
                Contemporary Wushu refers to a conglomerate of many traditional styles and their transformation into a competitive sport with standardized rules and judging.
                  A more thorough definition can be found at wikipedia: (<a href="http://en.wikipedia.org/wiki/Wushu" className="hover:underline text-secondary">http://en.wikipedia.org/wiki/Wushu</a>).</div>
          <div>&nbsp;</div>
          <div className="text-2xl">Collegiate Wushu</div>
          <div>&nbsp;</div>
          <div>The Annual Collegiate Wushu Tournament was created to foster collegiate-level wushu in the nation. The first tournament was hosted by the University of Oregon in 1997, organized by Brandon Sugiyama. Today, the tournament draws in competitors from universities all across the country and has been hosted on both the east and west coasts.</div>
          <div>&nbsp;</div>
          <div className="text-2xl">Collegiate Wushu</div>
          <div>&nbsp;</div>
          <div className="translate-x-4"><a href="http://jiayoowushu.com/collegiate-wushu-usa/" className="hover:underline text-secondary">Collegiate Wushu in the United States: What it Means for US Wushu</a> by Matthew Lee<br/>
          <a href="http://www.beijingwushuteam.com/collegiates/history.html" className="hover:underline text-secondary">Collegiate Wushu History 101</a> by Raffi<br/>
          <a href="http://www.beijingwushuteam.com/articles/collegiates2000.html" className="hover:underline text-secondary">Collegiates 2000</a> by Raffi<br/>
          <a href="http://www.beijingwushuteam.com/articles/collegiates1999.html" className="hover:underline text-secondary">The 1999 Collegiates and Magic Mountain Experience!</a> by Raffi</div>
          <div>&nbsp;</div>
        </div>
      </div>
      <div className="flex-col  bg-off-white text-primary py-10">
        <div className="content-center w-full max-w-8/10 translate-x-1/10">
          <div>&nbsp;</div>
          <header className="flex items-center text-6xl animate-fadeIn">CWCMembers</header>
          <div>&nbsp;</div>
          <div>The Collegiate Wushu Committee (CWC) currently consists of one voting representative from each of the following universities:</div>
          <div>&nbsp;</div>
          <div className="translate-x-4">
            1. Columbia University<br/>
            2. Stanford University<br/>
            3. University of California, Berkeley<br/>
            4. University of California, Irvine<br/>
            5. University of California, Los Angeles<br/>
            6. University of California, San Diego<br/>
            7. University of Maryland, College Park<br/>
            8. University of Oregon<br/>
            9. University of Pittsburgh<br/>
            10. University of Virginia<br/>
            11. niversity of Washington
          </div>
          <div>&nbsp;</div>
          <div>The CWC also includes alumni members serving as advisers.</div>
          <div>&nbsp;</div>
          <div>Each year, a call is made to clubs for the position of host, and bids are voted on by the Collegiate Wushu Committee voting members. The CWC is composed of advisers and school representatives, with each school on the CWC posessing one voting representative. The CWC also discusses and votes on changes to tournament rules such as competitor eligiblity requirements and experience level determination. Once a school has hosted a Collegiate Wushu Tournament, they will receive an invitation to join the CWC.</div>
          <div>&nbsp;</div>
        </div>
      </div>
      <div className="flex-col  bg-primary text-off-white py-10">
        <div className="content-center w-full max-w-8/10 translate-x-1/10">
          <div>&nbsp;</div>
          <header className="flex items-center text-6xl animate-fadeIn">Previous Hosts</header>
          <div>&nbsp;</div>
          <div className="max-h-100 overflow-y-auto">
            2026: University of California, Davis<br/>
            2025: University of Maryland, College Park<br/>
            2024: University of California, Los Angeles<br/>
            2023: University of California, Berkeley<br/>
            2019: University of California, Irvine<br/>
            2018: University of PIttsburgh<br/>
            2017: University of Washington<br/>
            2016: Columbia University<br/>
            2015: University of California, Irvine<br/>
            2014: University of Maryland, College Park<br/>
            2013: University of California, San Diego<br/>
            2012: University of Virginia<br/>
            2011: University of California, Los Angeles<br/>
            2010: University of Oregon<br/>
            2009: Georgia Institute of Technology<br/>
            2008: Stanford University<br/>
            2007: University of Maryland, College Park<br/>
            2006: University of Oregon<br/>
            2005: University of California, Davis<br/>
            2004: Stanford University<br/>
            2003: University of California, Berkeley<br/>
            2002: University of Oregon<br/>
            2001: California State University, Fullerton<br/>
            2000: Stanford University<br/>
            1999: University of California, Irvine<br/>
            1998: University of California, Berkeley<br/>
            1997: University of Oregon<br/>
          </div>
        </div>
      </div>
      <div className="bg-off-white">
        <CWCReps/>
      </div>
    </UserLayout>
  );
}
