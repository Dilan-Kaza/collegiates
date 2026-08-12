import { redirect } from "next/navigation";
import ProfileSetup from "./ProfileSetup";
import type { ProfileInitial } from "./ProfileSetup";
import { getColleges } from "@functions/data";
import { requireCompetitor } from "@/lib/auth";
import { fromGender, fromSkillLevel, fromStudentType } from "@/lib/api";
import { loadSettings } from "@/lib/settings";
import prisma from "@/lib/prisma";
// competitor profile setup page (server component) — onboarding + yearly renewal

export default async function Page() {
  // Competitor-only, matching saveCompetitorProfile's own gate: organizers go to
  // their console, and no other account type has a competitor profile to set up.
  const user = await requireCompetitor();

  // Both are cached reads and neither depends on the other, so they go together.
  const [settings, colleges] = await Promise.all([loadSettings(), getColleges()]);
  const currentYear = settings?.reg_year ?? null;
  const profile = user.competitor_profile;

  // Already confirmed this year (direct navigation only). Editing needs zero
  // registrations; otherwise there's nothing to do, so go to the dashboard.
  if (profile && currentYear != null && profile.last_reg_year === currentYear) {
    const hasRegs =
      (await prisma.registration.count({
        where: { competitor_id: user.user_id, comp_year: currentYear },
      })) > 0;
    if (hasRegs) redirect("/competitor");
  }

  const initial: ProfileInitial = {
    gender: fromGender(profile?.gender) ?? "",
    school: profile?.school_id ?? "",
    student_type: fromStudentType(profile?.student_type) ?? "",
    skill_level: fromSkillLevel(profile?.skill_level) ?? "",
  };

  // <ProfileSetup> binds the college list to its cache entry, which is what seeds it.
  return <ProfileSetup colleges={colleges} initial={initial} />;
}
