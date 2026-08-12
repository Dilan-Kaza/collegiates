"use client";

export default function Arbitration() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <p className="text-sm text-gray-500 italic">Rules copied from USWU 2002 Rules and 2004 Rules Addendum unless otherwise specified.</p>

      <div>
        <h3 className="text-base font-semibold mb-3 text-primary">I. Definitions</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <h4 className="font-medium mb-1 text-primary">A. Arbitration</h4>
            <p>A matter officially and properly submitted to the arbitrator for investigation and rendering of a decision. The decision of the arbitrator is final and binding.</p>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">B. Arbitrator</h4>
            <p>An individual, impartial to the outcome, who is empowered to examine the facts and render a decision. This official is separate from all other tournament officials.</p>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">C. Who May Request Arbitration</h4>
            <p>A competitor who believes there was an irregularity in applying the rules to their own performance. A coach or designated representative may apply on behalf of the competitor only if the competitor is incapacitated.</p>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">D. What May Be Arbitrated</h4>
            <p className="mb-1"><span className="font-medium">Eligible:</span> Errors of administration, procedure, or fact — e.g. registrar errors, enrollment in incorrect division, misidentification of an athlete, incorrectly recorded scores, mathematical errors, timing signals incorrectly presented, interference from outside the ring, or actions of a judge inappropriate to their duties.</p>
            <p className="mb-1"><span className="font-medium">Not eligible:</span> Requests regarding another athlete's match or performance. No athlete may request re-examination of their own performance to obtain a different score or evaluation — scores must be given by judges based on their observation during the actual performance from their particular vantage point.</p>
            <p>Requests must be made in good faith, signed by one person only, based on provable facts (not opinion), and must clearly state what error was committed, who committed it, and what action is sought.</p>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">E. Time Limit for Requesting Arbitration</h4>
            <p className="mb-1">The initial complaint must be presented to the Chief Judge immediately after the occasion or incident.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Prior to the end of the competition division, the competitor must notify the Chief Judge that a formal arbitration request will be submitted.</li>
              <li>The Chief Judge will notify all competitors of a delay in final results pending arbitration.</li>
              <li>The written arbitration request must be submitted within two hours following the individual's performance.</li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-3 text-primary">II. Arbitration Procedure</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <h4 className="font-medium mb-1 text-primary">A. Notification</h4>
            <p>The athlete, coach, or designated representative must first inform the Chief Referee of the division of the intent to submit a request for arbitration.</p>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">B. Submitting a Request</h4>
            <p>A written request must be submitted — verbal requests are not accepted. The request must clearly state what error was committed and what resolution is desired.</p>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">C. Payment of Fee</h4>
            <p>A $100 cash deposit must accompany the request. If the decision favors the competitor, the fee is refunded.</p>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">D. Investigation</h4>
            <p>The arbitrator investigates the matter by reviewing official records, examining equipment, and interviewing any persons involved in an official capacity — including the competitor, Chief Judge, Scoring Judges, Timekeeper, Scorekeeper, Ring Coordinators, Routine Examiners, opponents, and others as necessary.</p>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">E. Decision</h4>
            <p>The arbitrator states findings and decision in writing, responding to the specifics of the request. The decision is final and binding on all parties.</p>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-primary">F. Confidentiality</h4>
            <p>All matters of arbitration are treated as confidential by the officials involved.</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-3 text-primary">III. Calling for a CWC Meeting</h3>
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
          <li>CWC votes can only be called by CWC members. Parties outside the CWC may request a vote but at least one CWC member must sponsor the request for the CWC to convene.</li>
          <li>CWC votes on the day of the tournament are allowed, but the topic must involve more than one school, group, and/or competitor, and must be an urgent or emergent matter.</li>
          <li>Day-of CWC votes may affect only the single tournament during which the vote was called.</li>
          <li>Changes to tournament rules that carry forward to future tournaments can only be passed via standard voting procedure: a two-week process with one week of discussion followed by one week of voting.</li>
        </ul>
      </div>
    </div>
  );
}
