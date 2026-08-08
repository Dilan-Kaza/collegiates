import type { Metadata } from "next";
import { ImgHeader } from "@components";
// DISABLED 2026-08-02 — Jira bug report. Uncomment this and the "Report a Bug"
// band below when asked to fix that code; see the header note in
// app/contact/BugReportForm.tsx for the other places to re-enable.
// import BugReportForm from "./BugReportForm";

export const metadata: Metadata = {
  title: "Contact Us | Collegiate Wushu",
  description: "Get in touch with the Collegiate Wushu Committee.",
};

// Addresses carried over from the old PHP site's contact page / contact section.
const contacts = [
  {
    role: "Collegiate Wushu Committee",
    detail:
      "Tournament questions, committee business, hosting bids, and rule inquiries",
    email: "collegiatewushucommittee@gmail.com",
  },
  {
    role: "Webmaster",
    detail: "Problems with this site — broken pages, bad data, or anything that won't load",
    email: "dkaza0001@gmail.com",
  },
];

export default function Page() {
  return (
    <>
      <ImgHeader />
      <div className="flex-col bg-primary text-off-white md:py-10">
        <div className="content-center w-full max-w-8/10 translate-x-1/10">
          <div>&nbsp;</div>
          <header className="flex items-center text-2xl md:text-6xl animate-fadeIn">CONTACT</header>
          <div>&nbsp;</div>
          <div className="text-sm md:text-base max-w-3xl">
            The Collegiate Wushu Committee does not run a ticketing system — email is the way to
            reach us. Pick the address that best matches your question and we will route it from
            there. For anything tournament-related, include your school and the year of the
            tournament you are asking about.
          </div>
          <div>&nbsp;</div>
        </div>
      </div>

      <div className="flex-col bg-off-white text-primary md:py-10">
        <div className="content-center w-full max-w-8/10 translate-x-1/10">
          <div>&nbsp;</div>
          <header className="flex items-center text-2xl md:text-6xl animate-fadeIn">Reach Us</header>
          <div>&nbsp;</div>
          <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
            {contacts.map(({ role, detail, email }) => (
              <div key={email} className="cg-card-accent">
                <div className="cg-eyebrow">{role}</div>
                <div className="text-sm md:text-base mt-2">{detail}</div>
                <a
                  href={`mailto:${email}`}
                  className="mt-3 inline-block text-sm md:text-base font-bold break-all hover:underline"
                >
                  {email}
                </a>
              </div>
            ))}
          </div>
          <div>&nbsp;</div>
        </div>
      </div>

      {/* DISABLED 2026-08-02 — Jira bug report band. Uncomment together with the
          BugReportForm import above when asked to fix that code. Note the band
          colors alternate: with this back in, "Follow Us" below should return to
          bg-primary/text-off-white and its links to text-secondary.
      <div className="flex-col bg-primary text-off-white md:py-10">
        <div className="content-center w-full max-w-8/10 translate-x-1/10">
          <div>&nbsp;</div>
          <header className="flex items-center text-2xl md:text-6xl animate-fadeIn">
            Report a Bug
          </header>
          <div>&nbsp;</div>
          <div className="text-sm md:text-base max-w-3xl">
            Something on this site broken or wrong? Send it here and it goes straight to our issue
            tracker. The more specific you are about what you clicked and what happened, the faster
            it gets fixed.
          </div>
          <div>&nbsp;</div>
          <BugReportForm />
          <div>&nbsp;</div>
        </div>
      </div>
      */}

      <div className="flex-col bg-primary text-off-white md:py-10">
        <div className="content-center w-full max-w-8/10 translate-x-1/10">
          <div>&nbsp;</div>
          <header className="flex items-center text-2xl md:text-6xl animate-fadeIn">Follow Us</header>
          <div>&nbsp;</div>
          <div className="text-sm md:text-base">
            Tournament announcements, results, and photos go up on our Facebook page:{" "}
            <a
              href="https://www.facebook.com/collegiatewushu/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-secondary"
            >
              facebook.com/collegiatewushu
            </a>
          </div>
          <div>&nbsp;</div>
          <div className="text-sm md:text-base">
            Hosting a future Collegiates? Read the{" "}
            <a href="/about" className="hover:underline text-secondary">
              About
            </a>{" "}
            page for how bids and CWC membership work, then email the committee.
          </div>
          <div>&nbsp;</div>
        </div>
      </div>
    </>
  );
}
