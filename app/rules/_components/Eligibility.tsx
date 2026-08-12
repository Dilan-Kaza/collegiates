"use client";

export default function Eligibility() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-3 text-primary">I. Eligibility</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 text-primary">Class 1 Competitors</h4>
            <p className="text-gray-700 mb-2">An undergraduate has five years to use four years of Class 1 eligibility starting from the first year of participation. Full-time graduate students are NOT limited by the 5-for-4 restriction. Eligibility is limited to:</p>
            <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-gray-700">
              <li>Current full-time* undergraduates.</li>
              <li>Current full-time* graduate students.</li>
              <li>Current part-time* undergraduates working towards a degree.</li>
              <li>Fall graduates of the current academic year (last semester/quarter must be working toward major/graduation requirements if taking a reduced course load).</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-primary">Class 2 Competitors</h4>
            <p className="text-gray-700 mb-2">A competitor not Class 1 eligible is Class 2 eligible if affiliated with a North American university or college and is:</p>
            <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-gray-700">
              <li>A non-enrolled student pursuing a degree but not enrolled for classes for the current term.</li>
              <li>A one-year alumnus: a student (part or full time) working towards a degree one year or less from the date of competition.</li>
              <li>An undergraduate who is no longer Class 1 eligible.</li>
              <li>A part-time graduate student working towards a degree.</li>
              <li>An international student currently attending a North American university or college.</li>
            </ul>
          </div>
          <p className="text-sm text-gray-500 italic">*Full-time or part-time is defined as having that status at the university ON DAY of the tournament.</p>
        </div>
      </div>
      <div>
        <h3 className="text-base font-semibold mb-3 text-primary">II. Proof of Enrollment</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 text-primary">Class 1 Competitors</h4>
            <p className="text-gray-700 mb-2">Proof of current enrollment is required before the competition. Student ID alone does not qualify. Accepted proof:</p>
            <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-gray-700">
              <li>An approved study list</li>
              <li>Transcript</li>
              <li>Research curriculum</li>
            </ul>
            <p className="text-gray-700 mt-2 mb-1">The proof must indicate:</p>
            <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-gray-700">
              <li>Date, semester, or quarter for which it applies</li>
              <li>That the student is taking at least the minimum credits for full-time status, or indicates the degree being sought or granted</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-primary">Class 2 Competitors</h4>
            <p className="text-gray-700">Documentation required: a photocopy of the competitor's diploma (for alumni) or a formal document from the university's registrar's office such as a transcript for a previous term (for non-enrolled students). Both name and date must be visible.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
