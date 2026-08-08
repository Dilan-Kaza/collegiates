import { MtHeader } from "@components";
import { getLiveScores } from "@functions/actions";
import { requireUser, canViewLiveScores } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { formatSettingsDate } from "@/lib/dates";
import LiveScores from "./LiveScores";

// Live scoring is read off the competition's Google Sheet, so it is dynamic by
// definition — there is no build-time version of "what the judges have entered".
export const dynamic = "force-dynamic";

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="hidden md:block"><MtHeader /></div>
      <div className="max-w-5xl mx-auto w-full px-[5%] py-8">
        <div className="text-2xl font-semibold text-primary mb-4">Live Scoring</div>
        <div className="text-sm text-gray-400">{children}</div>
      </div>
    </>
  );
}

export default async function Page() {
  // Auth on the server so data ships with the page and no markup renders for a
  // visitor who may not see it.
  const user = await requireUser();
  const { allowed } = await canViewLiveScores(user);
  const settings = await loadSettings();

  // Told apart rather than collapsed into one message: a competitor on the wrong day needs the
  // date, everyone else that the page isn't theirs. The action gates independently.
  if (!allowed) {
    const compDay = formatSettingsDate("comp_date", settings?.comp_date);
    return (
      <Empty>
        {compDay
          ? `Live scoring opens to competitors on the day of the competition, ${compDay}.`
          : "Live scoring is not available to your account."}
      </Empty>
    );
  }

  const { status, scores } = await getLiveScores();

  if (status === "unconfigured") {
    return (
      <Empty>
        Live scoring is not set up yet. An organizer needs to paste the competition
        spreadsheet&apos;s link into the Scoring Link field in Settings, and the sheet must be
        shared with this deployment&apos;s service account.
      </Empty>
    );
  }

  if (status !== "ok" || !scores) {
    return <Empty>No scoring sheets have been published for this competition yet.</Empty>;
  }

  return (
    <>
      <div className="hidden md:block"><MtHeader /></div>
      <div className="max-w-5xl mx-auto w-full px-[5%] py-8">
        <div className="text-2xl font-semibold text-primary mb-4">Live Scoring</div>
        <LiveScores initial={scores} />
      </div>
    </>
  );
}
