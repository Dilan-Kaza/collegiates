"use client";

export default function Disqualification() {
  return (
    <div className="space-y-4">
      <p className="text-gray-700">To encourage a fair tournament, a strict disqualification policy is in effect.</p>
      <ol className="list-decimal pl-4 sm:pl-6 space-y-2 sm:space-y-3 text-gray-700">
        <li>Failure to bring valid documents to prove eligibility will result in disqualification from the tournament.</li>
        <li>Dishonest reporting of years of training (skill level) will result in disqualification.</li>
        <li>Dishonest reporting of student status will result in ineligibility to compete for 1 year. Any medals won during the competition in which dishonesty occurred will be stripped from the competitor.</li>
        <li>If the dishonest competitor also participated in the team competition, the school will be barred from team competition for 1 year. The team's results will be nullified and any medals won during that competition will be stripped from the team.</li>
        <li>A disqualified team member causes their entire team to be disqualified from the team competition. Non-disqualified team members are still eligible to compete in individual competition.</li>
        <li>A competitor can also be disqualified for cheating, unsportsmanlike behavior, or failure to accord proper respect and courtesy towards the judges, tournament staff, fellow competitors, or instructors present at the competition.</li>
        <li>Disqualifications will be made official by the tournament's judge general.</li>
      </ol>
    </div>
  );
}
