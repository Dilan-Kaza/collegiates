"use client";

import { Link } from "@/routerCompat";

export default function OfficialRules() {
  return (
    <div className="space-y-4">
      <p className="text-gray-700">This page compiles all rule sets utilized by the National Collegiate Wushu Tournament for easier viewing.</p>
      <div className="space-y-3">
        <Link to="/documents/2019collegiaterules.pdf" target="_blank" rel="noopener noreferrer" prefetch={false} className="block cg-card-accent hover:shadow-md transition">
          <h3 className="font-semibold text-primary">Collegiate Wushu Tournament Rules</h3>
          <p className="text-gray-600 mt-1">Tournament-specific rules outlining competitor eligibility, experience level requirements, team competition rules, all-around champion rules, and group set rules.</p>
        </Link>
        <Link to="/documents/USWURulebook2002.pdf" target="_blank" rel="noopener noreferrer" prefetch={false} className="block cg-card-accent space-y-2 hover:shadow-md transition">
          <h3 className="font-semibold text-primary">United States Wushu Union (USWU) Rules</h3>
          <p className="text-gray-600">All individual events are judged using USWU 2002 rules and 2004 rules addendum unless otherwise specified (e.g. nandu events).</p>
          <div className="pt-1">
            <button onClick={e => { e.stopPropagation(); window.open("/documents/document.pdf", "_blank", "noopener,noreferrer"); }} className="text-sm text-primary underline hover:opacity-70">View 2004 Addendum</button>
          </div>
        </Link>
        <Link to="/documents/iwuf_rules_taolu_2005.pdf" target="_blank" rel="noopener noreferrer" prefetch={false} className="block cg-card-accent hover:shadow-md transition">
          <h3 className="font-semibold text-primary">International Wushu Federation (IWUF) Rules</h3>
          <p className="text-gray-600 mt-1">IWUF rules are used ONLY for the three nandu events: nandu changquan, nandu nanquan, and nandu taijiquan.</p>
        </Link>
      </div>
    </div>
  );
}
