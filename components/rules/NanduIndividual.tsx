"use client";

export default function NanduIndividual() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <p className="text-gray-700">For the following events, IWUF 2005 rules are used for judging and scoring:</p>
      <ul className="list-disc pl-5 space-y-2 text-gray-700">
        <li>Nandu ChangQuan</li>
        <li>Nandu NanQuan</li>
        <li>Nandu TaijiQuan</li>
      </ul>
      <div>
        <h3 className="text-base font-semibold mb-2 text-primary">Helpful Links</h3>
        <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-gray-700">
          <li>IWUF 2005 Rules</li>
          <li>Nandu Code Tables <span className="text-gray-500 text-sm">(created unofficially)</span></li>
        </ul>
      </div>
    </div>
  );
}
