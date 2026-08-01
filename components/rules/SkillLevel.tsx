"use client";

export default function SkillLevel() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-3 text-primary">I. Skill Level Determination</h3>
        <p className="text-gray-700 mb-3">Skill level is determined by total years since beginning Chinese Wushu training of any type, not by time learning a particular event. Breaks from training are not subtracted.</p>
        <div className="overflow-x-auto mb-3">
          <table className="w-full border border-primary/20 text-sm">
            <thead className="bg-primary text-white">
              <tr>
                <th className="border p-3 text-left">Level</th>
                <th className="border p-3 text-left">Experience</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border p-3">Beginner**</td><td className="border p-3">0–1 Years</td></tr>
              <tr><td className="border p-3">Intermediate</td><td className="border p-3">1–3 Years</td></tr>
              <tr><td className="border p-3">Advanced***</td><td className="border p-3">3+ Years</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-700 mb-3">Competitors must compete at a consistent skill level throughout the entire tournament (cannot compete Intermediate in one event and Beginner in another). Violations are grounds for disqualification, which can also disqualify the competitor's team.</p>
        <div className="space-y-2 text-sm text-gray-600">
          <p>**If a competitor medals in beginner events with at least five competitors in their first year, they should move to intermediate the next year.</p>
          <p>***Advanced competitors wishing to compete at intermediate level may appeal by having their coach submit a request with qualifications to the host and Collegiate Wushu Committee. Supporting material (videos, written rationale) may be required. The appeal is reviewed by a certified or experienced judge.</p>
        </div>
      </div>
      <div>
        <h3 className="text-base font-semibold mb-3 text-primary">II. Form Restrictions Based on Skill Level</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 text-primary">Beginner</h4>
            <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-gray-700">
              <li>Only linear forms allowed.</li>
              <li>Maximum of two jumping techniques from: jumping front kick, jumping inside crescent kick, and jumping outside crescent kick.</li>
              <li>Cannot land on the jumping leg.</li>
              <li>No aerials, splits, or any other B-level move.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-primary">Intermediate</h4>
            <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-gray-700">
              <li>No butterfly twists, aerial twists, or any jumping technique with 540 degrees or greater rotation.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-primary">Advanced</h4>
            <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-gray-700">
              <li>No form restrictions.</li>
            </ul>
          </div>
          <p className="text-sm text-gray-700">Deductions: 0.3 deduction each time a competitor does not comply with Beginner or Intermediate restrictions, deducted from the final score for each deviation.</p>
        </div>
      </div>
    </div>
  );
}
