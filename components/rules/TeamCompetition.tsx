"use client";

export default function TeamCompetition() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-3 text-primary">I. Definition and Requirements</h3>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>A team consists of 6 competitors determined during registration.</li>
          <li>All competitors must be Class 1 eligible at the same university or college.</li>
          <li>No more than 3 teams may be sent from the same university.</li>
          <li>No more than 3 competitors competing at beginner level may be on the same team.</li>
        </ul>
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          <p>*A team not meeting the above requirements is not eligible to place in Team Competition or Group Set. They may still compete in Group Set for a score.</p>
          <p>**Substitutions are allowed prior to the group set event if a registered member drops out due to injury or other reasons. Whether a substitute may register for additional individual events after the deadline is left to the host's discretion.</p>
        </div>
      </div>
      <div>
        <h3 className="text-base font-semibold mb-3 text-primary">II. Criteria and Methods of Scoring</h3>
        <p className="text-gray-700 mb-3">A team's total score = Group Set Placement + Individual Placements of each team member. The highest total wins.</p>
        <div className="space-y-4">
          <div className="border-l-4 border-l-secondary border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-primary">1. Group Set Placement</h4>
            <table className="w-full border border-primary/20 text-sm">
              <thead className="bg-primary text-white">
                <tr><th className="border p-2 text-left">Placement</th><th className="border p-2 text-left">Points</th></tr>
              </thead>
              <tbody>
                <tr><td className="border p-2">1st Place</td><td className="border p-2">6 points</td></tr>
                <tr><td className="border p-2">2nd Place</td><td className="border p-2">4 points</td></tr>
                <tr><td className="border p-2">3rd Place</td><td className="border p-2">2 points</td></tr>
                <tr><td className="border p-2">4th and Below</td><td className="border p-2">1 point</td></tr>
              </tbody>
            </table>
          </div>
          <div className="border-l-4 border-l-secondary border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-primary">2. Individual Placement ("Team Placements")</h4>
            <p className="text-sm text-gray-700 mb-2">Points awarded per team member for their two best events, counting only among competitors in the team competition (Class 2 placements are skipped). Max contribution per member: 6 points.</p>
            <table className="w-full border border-primary/20 text-sm">
              <thead className="bg-primary text-white">
                <tr><th className="border p-2 text-left">Placement</th><th className="border p-2 text-left">Points</th></tr>
              </thead>
              <tbody>
                <tr><td className="border p-2">1st Place</td><td className="border p-2">3 points</td></tr>
                <tr><td className="border p-2">2nd Place</td><td className="border p-2">2 points</td></tr>
                <tr><td className="border p-2">3rd Place</td><td className="border p-2">1 point</td></tr>
                <tr><td className="border p-2">4th and Below</td><td className="border p-2">0 points</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-sm text-gray-500 italic mt-3">*Tiebreaker: team with the most 1st-place team placements wins. If still tied, the team with the most 2nd-place team placements wins.</p>
      </div>
    </div>
  );
}
