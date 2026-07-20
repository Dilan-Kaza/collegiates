"use client";

export default function AllIndividual() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <p className="text-sm text-gray-500 italic">Rules copied from USWU 2002 Rules and 2004 Rules Addendum unless otherwise specified.</p>

      <div>
        <h3 className="text-base font-semibold mb-2 text-primary">I. Costumes/Uniforms</h3>
        <h4 className="font-medium mb-1 text-primary">Specifications</h4>
        <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-sm text-gray-700 mb-3">
          <li>Tops: tournament/event T-shirts or traditional Chinese-style jackets of any material.</li>
          <li>**Wearing sashes and tucking in T-shirts is optional for the Annual Collegiate Wushu Tournament.</li>
          <li>Pants: long, either gathered or open at the ankles.</li>
          <li>Shoes: martial arts style athletic shoes — stable and flexible at ankle and toe, low profile, good traction.</li>
          <li>Uniforms should be clean and wrinkle-free at the start of competition.</li>
          <li>*Club logo uniforms are permitted at the Annual National Collegiate Tournament.</li>
        </ul>
        <h4 className="font-medium mb-1 text-primary">Deductions</h4>
        <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-sm text-gray-700">
          <li>General non-conformity: 0.05 cumulative per instance (Chief Judge).</li>
          <li>Barefoot: 0.10 deduction.</li>
          <li>Costume obviously not of Chinese martial arts style (e.g. karate gi): 0.20 total deduction.</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-2 text-primary">II. Weapons</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <h4 className="font-medium mb-1 text-primary">Spear (Qiang)</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Must have a metal tip and horsehair tassel.</li>
              <li>Length no shorter than performer's wrist height when arm is raised straight overhead.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">Staff and Southern Staff (Gun/Nangun)</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Only one end may be tapered (no "bo" staffs with both ends tapered).</li>
              <li>Length no shorter than performer's height.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">Sword (Jian)</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Single-hand, double-edged straight sword.</li>
              <li>Point no shorter than the bottom of performer's ear when held by the guard.</li>
              <li>Contemporary events: tassel attached to pommel required.</li>
              <li>Classical events: sword must support its own weight point-down; tassel optional.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">Broadsword and Southern Broadsword (Dao/Nandao)</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Single-edged blade with slight convex curvature on the cutting edge.</li>
              <li>Contemporary: point no lower than the bottom of performer's ear when held at side.</li>
              <li>Classical: point no lower than the top of performer's shoulder when held at side.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">Other Weapons</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>All other weapons must be Chinese in origin.</li>
              <li>Not allowed: katana, manriki-gusari, kama, sai, etc. **Nunchucks are allowed as an Other Weapon at the Annual Collegiate Wushu Tournament.</li>
              <li>Acceptable examples: double broadsword, double straight sword, double hooks, three-section staff, chain whip, rope dart, guandao, pudao, tiger fork, two-handed sword, fan, dagger, etc.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">Weapon Deductions</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Too short: 0.05 per inch outside specifications.</li>
              <li>Non-length non-conformity: 0.10 at Chief Judge's discretion.</li>
              <li>Obviously not of Chinese origin: 0.20 total deduction.</li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-2 text-primary">III. Time Limits</h3>
        <div className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium mb-1 text-primary">Contemporary Wushu</h4>
            <table className="w-full border border-primary/20">
              <tbody>
                <tr><td className="border p-2">Beginner Level, All Ages</td><td className="border p-2">0:30 min</td></tr>
                <tr><td className="border p-2">Intermediate Level, All Ages</td><td className="border p-2">1:00 min</td></tr>
                <tr><td className="border p-2">Advanced Changquan/Nanquan</td><td className="border p-2">1:20 min</td></tr>
                <tr><td className="border p-2">Advanced Jian/Dao/Gun/Qiang</td><td className="border p-2">1:20 min</td></tr>
                <tr><td className="border p-2">42-Form Taijiquan</td><td className="border p-2">5:00–6:00</td></tr>
                <tr><td className="border p-2">42-Form Taijijian</td><td className="border p-2">3:00–4:00</td></tr>
                <tr><td className="border p-2">Advanced Other/Optional Forms &amp; Weapons</td><td className="border p-2">1:00 min</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">Classical External (Traditional) Wushu</h4>
            <table className="w-full border border-primary/20">
              <tbody>
                <tr><td className="border p-2">Ages 5–12, All Levels</td><td className="border p-2">0:30–2:00</td></tr>
                <tr><td className="border p-2">Beginner &amp; Intermediate, Teen &amp; Adult</td><td className="border p-2">0:30–2:00</td></tr>
                <tr><td className="border p-2">Advanced, Teen &amp; Adult</td><td className="border p-2">0:45–2:00</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">Classical Internal Wushu</h4>
            <table className="w-full border border-primary/20">
              <tbody>
                <tr><td className="border p-2">24-Form Taijiquan</td><td className="border p-2">4:00–5:00</td></tr>
                <tr><td className="border p-2">Yang, Chen, Wu, Hao, Sun Taijiquan</td><td className="border p-2">3:00–3:30</td></tr>
                <tr><td className="border p-2">Other Styles Taijiquan</td><td className="border p-2">3:00–3:30</td></tr>
                <tr><td className="border p-2">Baguazhang</td><td className="border p-2">1:00–2:00</td></tr>
                <tr><td className="border p-2">Xingyiquan</td><td className="border p-2">1:00–2:00</td></tr>
                <tr><td className="border p-2">Taiji Straight Sword</td><td className="border p-2">2:30–5:00</td></tr>
                <tr><td className="border p-2">Taiji Broadsword</td><td className="border p-2">2:00–3:00</td></tr>
                <tr><td className="border p-2">Other Internal Weapons</td><td className="border p-2">2:00–3:00</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">Sparring Sets</h4>
            <table className="w-full border border-primary/20">
              <tbody>
                <tr><td className="border p-2">Choreographed Sparring Sets</td><td className="border p-2">0:45–2:00</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">Time Limit Deductions</h4>
            <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-gray-700">
              <li>Must violate limit by more than 0.09 seconds to incur a deduction.</li>
              <li>Contemporary external: 0.10 per 2.0 seconds over/under.</li>
              <li>Classical external, internal styles (incl. 42-Taijiquan/Taijijian), sparring sets: 0.10 per 5.0 seconds over/under.</li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-2 text-primary">IV. Criteria and Methods of Scoring</h3>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-1 text-primary">A. Scoring Ranges (6.0–10.0 scale)</h4>
            <table className="w-full border border-primary/20">
              <thead className="bg-primary text-white">
                <tr><th className="border p-2 text-left">Score</th><th className="border p-2 text-left">Level</th><th className="border p-2 text-left">Grade</th></tr>
              </thead>
              <tbody>
                <tr><td className="border p-2">6.0–6.99</td><td className="border p-2">Beginner</td><td className="border p-2">C-Level</td></tr>
                <tr><td className="border p-2">7.0–7.99</td><td className="border p-2">Intermediate</td><td className="border p-2">B-Level</td></tr>
                <tr><td className="border p-2">8.0–8.99</td><td className="border p-2">Advanced</td><td className="border p-2">A-Level</td></tr>
                <tr><td className="border p-2">9.0–9.99</td><td className="border p-2">Very Advanced</td><td className="border p-2">AA-Level</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-medium mb-1 text-primary">B. General Method</h4>
            <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-gray-700">
              <li>5 Scoring Judges assign scores (two decimal places; second digit restricted to 0 or 5).</li>
              <li>Merited score = average of the middle 3 of 5 scores, truncated to two decimal places.</li>
              <li>Final score = Merited score minus Chief Judge deductions.</li>
              <li>If the spread between the highest and lowest raw scores is 0.70 or more, the Chief Judge calls for a re-score. The second set of scores stands regardless.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-1 text-primary">C. Breaking Ties</h4>
            <ol className="list-decimal pl-4 sm:pl-5 space-y-1 text-gray-700">
              <li>Competitor whose mean of the two dropped scores is closer to their final score placed higher.</li>
              <li>Competitor with the higher mean of the two dropped scores placed higher.</li>
              <li>Competitor whose lower dropped score is higher placed higher.</li>
            </ol>
            <p className="text-gray-500 italic mt-1">If still tied, competitors share the place and the next place is left vacant.</p>
          </div>

          <div>
            <h4 className="font-medium mb-2 text-primary">D. Scoring Criteria (max 10.0)</h4>
            <table className="w-full border border-primary/20 mb-3">
              <thead className="bg-primary text-white">
                <tr><th className="border p-2 text-left">Category</th><th className="border p-2 text-left">Points</th></tr>
              </thead>
              <tbody>
                <tr><td className="border p-2">Technical Specifications of Performance</td><td className="border p-2">6</td></tr>
                <tr><td className="border p-2">Demonstration of Power and Coordination</td><td className="border p-2">2</td></tr>
                <tr><td className="border p-2">Spirit, Rhythm, Content, Structure, Choreography</td><td className="border p-2">2</td></tr>
              </tbody>
            </table>

            <p className="font-medium mb-1 text-primary">Technical Specifications (6 pts)</p>
            <p className="text-gray-700 mb-1">Applies to hand/fist forms, stances, body positions, punching, footwork, kicking, jumps, balances, and weapon techniques. Also covers sharp edge touching body and improper weapon use.</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-700 mb-3">
              <li>Slight deviation: 0.05</li>
              <li>Apparent deviation: 0.10</li>
              <li>Serious deviation: 0.20 (max 0.20 for same movement or habitual error)</li>
            </ul>

            <p className="font-medium mb-1 text-primary">Power &amp; Coordination (2 pts)</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-700 mb-3">
              <li>Slight/occasional lack: 0.1–0.5 deduction</li>
              <li>Apparent/more frequent lack: 0.6–1.0 deduction</li>
              <li>Serious/repeated lack: 1.1–1.5 deduction</li>
              <li>Serious lack of both power and coordination: 1.6–2.0 deduction</li>
            </ul>

            <p className="font-medium mb-1 text-primary">Spirit, Rhythm, Content, Structure, Choreography (2 pts)</p>
            <p className="text-gray-700 mb-1">Spirit = martial intent through the eyes. Rhythm = pace control with distinct pauses and accelerations. Content = variety of techniques. Structure = cohesive flow between movements. Choreography = use of competition space in multiple directions.</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-700 mb-3">
              <li>Slight/occasional lack in 1–2 elements: 0.1–0.5</li>
              <li>Apparent/frequent lack in 1–2, or slight in 3+: 0.6–1.0</li>
              <li>Serious/repeated lack in 1–2, or apparent in 3+: 1.1–1.5</li>
              <li>Serious/repeated lack in 3+ elements: 1.6–2.0</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-1 text-primary">E. Additional Deductions — Scoring Judges</h4>
            <div className="space-y-2 text-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Forgetfulness</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Pause affecting harmony: 0.1</li>
                <li>Long pause: 0.2</li>
                <li>Pause leading to confused movements: 0.3</li>
              </ul>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mt-2">Costume/Uniform</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Body caught by broadsword flags or sword tassel: 0.1 per incident</li>
                <li>Weapon or garment decoration falls off: 0.1</li>
                <li>Uniform tears, sash/top/shoe falls off: 0.1</li>
              </ul>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mt-2">Loss/Breakage of Weapon</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Weapon touches body/floor inappropriately or comes loose: 0.1</li>
                <li>Weapon obviously bent or deformed: 0.2</li>
                <li>Weapon breaks or falls to ground: 0.5</li>
              </ul>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mt-2">Loss of Balance</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Sway or superfluous step: 0.1 (cumulative for repeats)</li>
                <li>Touching ground for support: 0.3</li>
                <li>Fall to ground: 0.5</li>
              </ul>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mt-2">Out of Ring Boundary</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Any part of body trespassing: 0.1</li>
                <li>Whole body trespassing: 0.2</li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-1 text-primary">F. Chief Judge Deductions</h4>
            <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-gray-700">
              <li>Improper vocalizations: 0.1 per occurrence</li>
              <li>Deviation in commencing or closing routine: 0.1</li>
              <li>Repetition due to uncontrollable circumstances (with Chief Judge approval): no deduction</li>
              <li>Repetition due to lapse of memory or damaged equipment: 1.0 deduction</li>
              <li>Repetition due to injury (if able to continue after first aid): 1.0 deduction; if unable, competitor forfeits that division</li>
              <li>Over/under time: per time limit deductions above</li>
              <li>Deviation from designated direction in compulsory/standard routine: 0.1 per occurrence</li>
              <li>Missing or additional movements in a compulsory/standard routine: deduction per occurrence</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
