"use client";

export default function AllAround() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-3 text-primary">I. Definitions and Requirements</h3>
        <p className="text-gray-700 mb-2">Basic requirements to qualify:</p>
        <ul className="list-disc pl-5 space-y-1 text-gray-700 mb-4">
          <li>Class 1 eligibility</li>
          <li>Advanced skill level</li>
        </ul>
        <p className="text-gray-700 mb-4">Each competitor may only register for one All-Around title per tournament and must specify prior to tournament day.</p>
        <div className="space-y-3">
          <div className="border-l-4 border-l-secondary border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-primary">External All-Around Champion</h4>
            <ol className="list-decimal pl-4 sm:pl-5 space-y-1 text-gray-700">
              <li>One event must be Changquan or Nanquan</li>
              <li>One event must be an external weapon form</li>
              <li>Any other external form not counted in 1 and 2</li>
              <li>Any other form not counted in 1, 2, and 3</li>
            </ol>
          </div>
          <div className="border-l-4 border-l-secondary border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-primary">Internal All-Around Champion</h4>
            <ol className="list-decimal pl-4 sm:pl-5 space-y-1 text-gray-700">
              <li>One event must be an internal bare-hand form</li>
              <li>One event must be an internal weapon form</li>
              <li>Any other internal event not counted in 1 and 2</li>
            </ol>
          </div>
        </div>
        <p className="text-sm text-gray-500 italic mt-3">*If no competitor is eligible for an All-Around title, that title will not be given.</p>
      </div>
      <div>
        <h3 className="text-base font-semibold mb-3 text-primary">II. Criteria and Methods for Scoring</h3>
        <p className="text-gray-700 mb-3">Champions are determined by placements in qualifying events. If a competitor competes in more than the minimum required events, the best placements are used.</p>
        <div className="overflow-x-auto">
          <table className="w-full border border-primary/20 text-sm">
            <thead className="bg-primary text-white">
              <tr>
                <th className="border p-3 text-left">Placement</th>
                <th className="border p-3 text-left">Points</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border p-3">1st Place</td><td className="border p-3">3 points</td></tr>
              <tr><td className="border p-3">2nd Place</td><td className="border p-3">2 points</td></tr>
              <tr><td className="border p-3">3rd Place</td><td className="border p-3">1 point</td></tr>
              <tr><td className="border p-3">4th and Below</td><td className="border p-3">0 points</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
