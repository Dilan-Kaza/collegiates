import { redirect } from "next/navigation";
import ProfileSetup from "./ProfileSetup";
import type { ProfileInitial } from "./ProfileSetup";
import { getColleges } from "@functions/data";
import { requireUser, canAccessOrganizer } from "@/lib/auth";
import { fromGender, fromSkillLevel, fromStudentType } from "@/lib/api";
import { loadSettings } from "@/lib/settings";
import prisma from "@/lib/prisma";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";
// competitor profile setup page (server component) — onboarding + yearly renewal

export default async function Page() {
  const user = await requireUser();
  if (await canAccessOrganizer(user)) redirect("/organizer");

  const settings = await loadSettings();
  const currentYear = settings?.reg_year ?? null;
  const profile = user.competitor_profile;

  // Already confirmed for the current year: only reachable by direct navigation.
  // Editing is permitted only while the competitor has no registrations for the
  // year; otherwise there is nothing to do here, so send them to the dashboard.
  if (profile && currentYear != null && profile.last_reg_year === currentYear) {
    const hasRegs =
      (await prisma.registration.count({
        where: { competitor_id: user.user_id, comp_year: currentYear },
      })) > 0;
    if (hasRegs) redirect("/dashboard");
  }

  const colleges = await getColleges();
  const initial: ProfileInitial = {
    gender: fromGender(profile?.gender) ?? "",
    school: profile?.school_id ?? "",
    student_type: fromStudentType(profile?.student_type) ?? "",
    skill_level: fromSkillLevel(profile?.skill_level) ?? "",
  };

  return (
    <>
      <CacheSeed entries={{ [cacheKeys.colleges]: colleges }} />
      <ProfileSetup colleges={colleges} initial={initial} />
    </>
  );
}
