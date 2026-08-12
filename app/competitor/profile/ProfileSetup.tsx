"use client";

import { MtHeader, Heading, Dropdown, Field, FormError, SubmitButton } from "@components";
import { useState } from "react";
import type { ReactNode, SyntheticEvent } from "react";
import { Link } from "@/routerCompat";
import { saveCompetitorProfile } from "@functions/actions";
import { runAction } from "@functions/actionErrors";
import { clearSessionCache } from "@functions/sessionCache";
import { cacheKeys, useCachedResource, fetchColleges } from "@functions";
import { useNavigate } from "@/routerCompat";
import { useAppDispatch } from "@/store/hooks";
import { setSuccessMsg } from "@slices";
import { validate, handleFormBlur, handleFormChange } from "@functions/forms";
import { GENDER_CHOICES, SKILL_LEVEL_CHOICES, SKILL_LEVEL_RESTRICTIONS, STUDENT_TYPE_CHOICES } from "@/lib/api";
// competitor profile setup — the onboarding step after sign-up, reused for the
// yearly re-confirmation when a new competition year starts

// Prefilled values for a returning competitor so re-confirming without changes
// is a single click; empty strings for a first-time setup.
export interface ProfileInitial {
  gender: string;
  school: string;
  student_type: string;
  skill_level: string;
}

// The college dropdown's trailing "Other" choice, for a competitor whose university is not
// on the list yet. It is a UI-only value: nothing is seeded for it, and the profile saves
// with no school (school_id null) until the organizer adds the university for real.
const OTHER_SCHOOL = "other";

// Level and class are self-reported but bind the competitor all tournament, so each field
// states its rule and links to the source in a new tab (the rest of the form is unsaved).
const SKILL_LEVEL_HINT = "Some moves are banned depending on your level.";
const ELIGIBILITY_HINT =
  "Class 1: enrolled undergrads and full-time grad students. Class 2: part-time grad students, " +
  "one-year alumni, non-enrolled students, and undergrads past their Class 1 years.";

function RuleHint({ section, children }: { section: string; children: ReactNode }) {
  return (
    <p className="-mt-1 text-xs leading-snug text-gray-600">
      {children}{" "}
      <Link
        to={`/rules?section=${section}`}
        target="_blank"
        rel="noopener noreferrer"
        prefetch={false}
        className="whitespace-nowrap text-primary underline hover:opacity-70"
      >
        Read the rule
      </Link>
    </p>
  );
}

export default function ProfileSetup({
  colleges: initialColleges = {},
  initial,
}: {
  colleges?: Record<string, string>;
  initial?: ProfileInitial;
}) {
  const nav = useNavigate();
  const dispatch = useAppDispatch();

  // The school dropdown's options, bound to the shared `colleges` entry so this
  // reads the same list every other screen with a college picker does.
  const colleges = useCachedResource(cacheKeys.colleges, fetchColleges, initialColleges);
  // "Other" trails the list: the spread keeps the cached entry itself untouched, so every
  // other college picker still offers real schools only.
  const collegeOptions = { ...colleges, Other: OTHER_SCHOOL };

  const [formData, setFormData] = useState<Record<string, string>>(initial ? { ...initial } : {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = handleFormChange(setFormData, setErrors);
  const handleBlur = handleFormBlur(setErrors, formData);
  const fieldProps = { formData, errors, handleChange, handleBlur };

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    const requiredFields = ["skill_level", "school", "gender", "student_type"];
    const allErrors: Record<string, string> = {};
    requiredFields.forEach((name) => {
      const err = validate(name, formData[name], formData);
      if (err) allErrors[name] = err;
    });
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }

    setLoading(true);
    const fallback = "Could not save your profile. Please try again.";
    try {
      const { error: fieldErrors } = await runAction(
        () => saveCompetitorProfile({
          skill_level: formData.skill_level,
          // "Other" is not a college id — it goes down as no school at all.
          school: formData.school === OTHER_SCHOOL ? "" : formData.school,
          gender: formData.gender,
          student_type: formData.student_type,
        }),
        fallback,
      );

      if (fieldErrors) {
        const transformed: Record<string, string> = {};
        Object.entries(fieldErrors).forEach(([field, message]) => {
          transformed[field] = Array.isArray(message) ? message[0] : message;
        });
        setErrors(transformed);
        setError(typeof fieldErrors.detail === "string" ? fieldErrors.detail : "Please fix the errors below");
        return;
      }
      setError("");
      // The profile is bundled into getMe, and gender/skill drive which events
      // the register page offers — both cached copies are now stale.
      clearSessionCache(cacheKeys.currentUser);
      clearSessionCache(cacheKeys.competitorEvents);
      dispatch(setSuccessMsg("Profile completed"));
      // Straight into event registration, the point of completing the profile. The register page
      // bounces anyone already registered this year, so re-confirmation stays correct.
      nav("/competitor/register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="hidden sm:block"><MtHeader /></div>
      <div
        id="bg-component"
        className="bg-primary h-screen w-full skew-y-10 absolute -top-[60svh] left-0 -z-20"
      />
      <div className="flex items-center justify-center px-4">
        <div className="grow min-w-0 bg-off-white max-w-[36rem] mt-0 sm:mt-10 rounded-xl border border-brown/50">
          <div className="flex flex-col items-center gap-4">
            <Heading className="mt-2 sm:mt-6 !text-4xl !p-2 !animate-none">Complete Your Profile</Heading>
            <form className="self-stretch px-4 sm:px-12 pb-10 flex flex-col gap-6" onSubmit={handleSubmit}>
              <FormError error={error} />
              {/* Two thirds to experience level, one to gender: the level's options
                  and its rule hint need the room, gender is two short words. Stacks
                  full width below sm. */}
              <div className="flex flex-col gap-4 sm:grid sm:grid-cols-3">
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Field {...fieldProps} as={Dropdown} name="skill_level" label="Experience Level*" options={SKILL_LEVEL_CHOICES} errorClass="mt-1" required />
                  <RuleHint section="skill-level">{SKILL_LEVEL_HINT}</RuleHint>
                  {/* What the chosen level forbids, once there is a choice — the
                      restrictions are the practical consequence of this field. */}
                  {SKILL_LEVEL_RESTRICTIONS[formData.skill_level] && (
                    <p className="rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-xs leading-snug text-gray-700">
                      {SKILL_LEVEL_RESTRICTIONS[formData.skill_level]}
                    </p>
                  )}
                </div>
                <div className="flex flex-col">
                  <Field {...fieldProps} as={Dropdown} name="gender" label="Gender*" options={GENDER_CHOICES} labelClass="min-w-[11rem] sm:min-w-0" errorClass="mt-1" required />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Field {...fieldProps} as={Dropdown} name="school" label="College*" options={collegeOptions} required />
                {/* Saving with "Other" leaves the profile without a school, so say what
                    it takes to get one — same box style as the level restrictions. */}
                {formData.school === OTHER_SCHOOL && (
                  <p className="rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-xs leading-snug text-gray-700">
                    Your university is not on the list yet. Email the tournament organizer to have
                    it added, then come back and select it here — until then your profile is saved
                    without a school.{" "}
                    <Link
                      to="/contact"
                      target="_blank"
                      rel="noopener noreferrer"
                      prefetch={false}
                      className="whitespace-nowrap text-primary underline hover:opacity-70"
                    >
                      Contact the organizer
                    </Link>
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Field {...fieldProps} as={Dropdown} name="student_type" label="Class Eligibility*" options={STUDENT_TYPE_CHOICES} required />
                <RuleHint section="eligibility">{ELIGIBILITY_HINT}</RuleHint>
              </div>
              <SubmitButton loading={loading} handleSubmit={handleSubmit} label="Save profile" />
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
