"use client";

export default function GroupSetRules() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-2 text-primary">I. Definition</h3>
        <p className="text-gray-700">Teams must compete with all 6 team members. A 1-point deduction per team member above or below 6. Substitutions are allowed prior to the event if a registered member drops out due to injury or other reasons.</p>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-2 text-primary">II. Time Limits</h3>
        <p className="text-gray-700 mb-2">Timer starts on the first coordinated movement after setup and ends on the final salute. Teams are judged only on content performed within the timed period.</p>
        <table className="w-full border border-primary/20 text-sm mb-2">
          <tbody>
            <tr><td className="border p-2 font-medium">Minimum</td><td className="border p-2">1 minute 30 seconds</td></tr>
            <tr><td className="border p-2 font-medium">Maximum</td><td className="border p-2">3 minutes</td></tr>
          </tbody>
        </table>
        <p className="text-sm text-gray-700">Deductions: 0.1 per 5 seconds over/under (rounded up). E.g. 2 sec over = 0.1; 10 sec over = 0.2; 11 sec over = 0.3. Head judge may stop a group set going over time by more than 30 seconds.</p>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-2 text-primary">III. Scoring (max 10.0)</h3>
        <p className="text-gray-700 mb-2">Three subscores, each judged by a panel of 3 judges (averaged):</p>
        <table className="w-full border border-primary/20 text-sm mb-4">
          <thead className="bg-primary text-white">
            <tr><th className="border p-2 text-left">Category</th><th className="border p-2 text-left">Max</th></tr>
          </thead>
          <tbody>
            <tr><td className="border p-2">Technical Execution of Techniques</td><td className="border p-2">4.0</td></tr>
            <tr><td className="border p-2">Coordination of Movements/Formation</td><td className="border p-2">3.0</td></tr>
            <tr><td className="border p-2">Performance, Choreography, and Difficulty</td><td className="border p-2">3.0</td></tr>
          </tbody>
        </table>

        <h4 className="font-medium mb-1 text-primary">Tiebreaker (in order)</h4>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 mb-4">
          <li>Higher technical execution subscore</li>
          <li>Higher coordination subscore</li>
          <li>Lowest variance in technical execution judges' scores</li>
          <li>Lowest variance in coordination judges' scores</li>
          <li>Higher lowest technical execution judge score</li>
          <li>Higher lowest coordination judge score</li>
        </ol>
        <p className="text-sm text-gray-600 mb-4">If still tied, groups share the place and the next place is left vacant.</p>

        <h4 className="font-medium mb-1 text-primary">Technical Execution (4 pts)</h4>
        <p className="text-sm text-gray-700 mb-1">Applies to stances, body positions, striking, footwork, kicking, jumps, balances, and weapon techniques across all styles included. Deviations are evaluated in aggregate across all members.</p>
        <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-sm text-gray-700 mb-2">
          <li>Slight deviation: 0.05 per occurrence</li>
          <li>Apparent deviation: 0.10 per occurrence</li>
          <li>Serious deviation: 0.20 per occurrence (max 0.20 for same movement or habitual error)</li>
        </ul>
        <p className="text-sm text-gray-700 mb-1">Loss of balance:</p>
        <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-sm text-gray-700 mb-2">
          <li>Sway or superfluous step: 0.1 (cumulative)</li>
          <li>Touching ground for support: 0.2</li>
          <li>Fall to ground: 0.3</li>
        </ul>
        <p className="text-sm text-gray-700 mb-1">Weapons:</p>
        <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-sm text-gray-700 mb-2">
          <li>Touching body/floor inappropriately or coming loose: 0.1</li>
          <li>Obviously bent or deformed: 0.2</li>
          <li>Breaking or falling to ground: 0.3</li>
        </ul>
        <p className="text-sm text-gray-700 mb-1">Uniform malfunctions:</p>
        <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-sm text-gray-700 mb-3">
          <li>Body caught by broadsword flags or sword tassel: 0.1</li>
          <li>Decoration falling off: 0.1</li>
          <li>Uniform tearing, sash/top/shoe falling off: 0.1</li>
        </ul>
        <p className="text-sm text-gray-500 italic mb-4">Balance/weapon/uniform deductions do not apply to intentionally performed actions.</p>

        <h4 className="font-medium mb-1 text-primary">Coordination (3 pts)</h4>
        <p className="text-sm text-gray-700 mb-1">Covers timing (unison, complementary, sequential rhythm, fight set coordination) and positioning (even spacing, precise formations, no excessive individual separation).</p>
        <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-sm text-gray-700 mb-4">
          <li>Slight deviation: 0.05 per occurrence</li>
          <li>Serious deviation: 0.10 per occurrence (no limit on total deductions)</li>
        </ul>

        <h4 className="font-medium mb-1 text-primary">Performance, Choreography &amp; Difficulty (3 pts)</h4>
        <p className="text-sm text-gray-700 mb-1">Performance/Choreography subscore (0.0–2.0) — elements: stage presence, rhythm, content, structure:</p>
        <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-sm text-gray-700 mb-2">
          <li>1.5–2.0: Slight/occasional lack in 1–2 elements</li>
          <li>1.0–1.5: Apparent/frequent lack in 1–2, or slight lack in 3+ elements</li>
          <li>0.5–1.0: Serious/repeated lack in 1–2, or apparent lack in 3+ elements</li>
          <li>0.0–0.5: Serious/repeated lack in 3+ elements</li>
        </ul>
        <p className="text-sm text-gray-700 mb-1">Difficulty subscore (0.0–1.0):</p>
        <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-sm text-gray-700 mb-4">
          <li>0.0–0.4: Beginner level</li>
          <li>0.4–0.7: Intermediate level</li>
          <li>0.7–1.0: Advanced level</li>
        </ul>
        <p className="text-sm text-gray-600">Incorrectly executed movements do not contribute to difficulty score.</p>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-2 text-primary">IV. Group Set Addendum</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <p><span className="font-medium">Technical Execution:</span> All included movements must use proper wushu technique — both taolu and fight set. Each style must be correctly executed (e.g. a set with changquan and nanquan must correctly execute both). Apply the same quality standards as individual events when deciding whether to include advanced techniques.</p>
          <p><span className="font-medium">Coordination:</span> All six members must contribute to the overall performance. Timing means doing the same or complementary movements in unison at a consistent or appropriate rhythm. Positioning means evenly spaced members in precise formations. A group set should not have excessive time with individual members separated from the group — it is a coordinated performance, not a sequence of individual routines.</p>
          <p><span className="font-medium">Performance:</span> Stage presence is the expression of martial intent through focus and intensity of the eyes. Rhythm is the control of pace — pauses and accelerations should be distinctly displayed. Non-wushu elements (pop culture, storytelling, non-traditional costumes) are permissible if they don't detract from the wushu, but do not earn additional points.</p>
          <p><span className="font-medium">Choreography:</span> Content should include a wide variety of techniques using all parts of the body. More content is not always better — members must successfully demonstrate understanding of what is included. Structure means cohesive flow between movements and good use of the full competition area. If a fight set is included, use wushu duilian/stage fighting techniques with appropriate believability and intensity. Including a fight set is not required.</p>
        </div>
      </div>
    </div>
  );
}
