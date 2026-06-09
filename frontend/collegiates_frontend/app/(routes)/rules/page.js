import { ImgHeader } from "@/app/layouts/headers";
import { NavBar } from "@/app/components/navbar";
import { UserLayout } from "@/app/layouts/layouts";

export default function Rules() {
  return (
    <UserLayout navBar={<NavBar/>} header={<ImgHeader/>}>
      <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-4 gap-8">

    <aside className="md:col-span-1">
      <div className="bg-white rounded-lg shadow sticky top-6">
        <div className="p-5 border-b">
          <h2 className="font-semibold text-lg">
            Table of Contents
          </h2>
        </div>

        <nav className="p-4">
          <ul className="space-y-2 text-sm">
            <li><a href="#eligibility" className="text-blue-600 hover:underline">1. Eligibility</a></li>
            <li><a href="#awards" className="text-blue-600 hover:underline">2. Awards</a></li>
            <li><a href="#skill-level" className="text-blue-600 hover:underline">3. Skill Level</a></li>
            <li><a href="#all-around" className="text-blue-600 hover:underline">4. All-Around Champions</a></li>
            <li><a href="#team" className="text-blue-600 hover:underline">5. Team Competition</a></li>
            <li><a href="#group" className="text-blue-600 hover:underline">6. Group Set Event</a></li>
            <li><a href="#individual" className="text-blue-600 hover:underline">7. Individual Events</a></li>
            <li><a href="#nandu" className="text-blue-600 hover:underline">8. Nandu Events</a></li>
            <li><a href="#format" className="text-blue-600 hover:underline">9. General Format</a></li>
            <li><a href="#arbitration" className="text-blue-600 hover:underline">10. Arbitration</a></li>
            <li><a href="#disqualification" className="text-blue-600 hover:underline">11. Disqualification</a></li>
          </ul>
        </nav>
      </div>
    </aside>

    <main className="md:col-span-3 space-y-8">

      <section className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-4">
          Official Rule Sets
        </h2>

        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold">
              Collegiate Wushu Tournament Rules
            </h3>
            <p className="text-gray-600 mt-1">
              Tournament-specific eligibility, team competition,
              all-around champions, and group set rules.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold">
              USWU Rules
            </h3>
            <p className="text-gray-600 mt-1">
              Used for individual events unless otherwise specified.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold">
              IWUF Rules
            </h3>
            <p className="text-gray-600 mt-1">
              Used only for Nandu events.
            </p>
          </div>
        </div>
      </section>

      <section id="eligibility" className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6">
          1. Eligibility
        </h2>

        <div className="space-y-6">

          <div>
            <h3 className="text-lg font-semibold mb-3">
              Class 1 Competitors
            </h3>

            <ul className="list-disc pl-6 space-y-2">
              <li>Current full-time undergraduates</li>
              <li>Current full-time graduate students</li>
              <li>Current part-time undergraduates pursuing degrees</li>
              <li>Fall graduates of the current academic year</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">
              Class 2 Competitors
            </h3>

            <ul className="list-disc pl-6 space-y-2">
              <li>Non-enrolled students</li>
              <li>Recent alumni</li>
              <li>Former Class 1 undergraduates</li>
              <li>Part-time graduate students</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="awards" className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6">
          2. Awards
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-5">
            <h3 className="font-semibold">Individual Events</h3>
            <p className="text-gray-600 mt-2">
              1st, 2nd, and 3rd place medals.
            </p>
          </div>

          <div className="border rounded-lg p-5">
            <h3 className="font-semibold">All-Around Champions</h3>
            <p className="text-gray-600 mt-2">
              Internal and external champion awards.
            </p>
          </div>

          <div className="border rounded-lg p-5">
            <h3 className="font-semibold">Team Competition</h3>
            <p className="text-gray-600 mt-2">
              Team placements awarded separately.
            </p>
          </div>
        </div>
      </section>

      <section id="skill-level" className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6">
          3. Skill Levels
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border p-3 text-left">Level</th>
                <th className="border p-3 text-left">Experience</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-3">Beginner</td>
                <td className="border p-3">0–1 Years</td>
              </tr>
              <tr>
                <td className="border p-3">Intermediate</td>
                <td className="border p-3">1–3 Years</td>
              </tr>
              <tr>
                <td className="border p-3">Advanced</td>
                <td className="border p-3">3+ Years</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="disqualification" className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6">
          11. Disqualification
        </h2>

        <ol className="list-decimal pl-6 space-y-3">
          <li>Failure to provide eligibility documentation.</li>
          <li>Dishonest reporting of training experience.</li>
          <li>Dishonest reporting of student status.</li>
          <li>Cheating or unsportsmanlike conduct.</li>
          <li>Failure to respect judges and staff.</li>
        </ol>
      </section>

    </main>
  </div>
  <div className="px-1 text-off-white"> this page is vibecoded, pls take your complaints to dilan for now</div>
    </UserLayout>
  );
}
