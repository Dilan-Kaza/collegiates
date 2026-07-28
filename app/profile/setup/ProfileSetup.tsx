"use client";

import { MtHeader, Heading, Dropdown, Field, SignUpError, SignUpSubmit } from "@components";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import { saveCompetitorProfile } from "@functions/actions";
import { useNavigate } from "@/routerCompat";
import { useDispatch } from "react-redux";
import { setSuccessMsg } from "@slices";
import { validate, handleFormBlur, handleFormChange } from "@functions/forms";
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

export default function ProfileSetup({
  colleges = {},
  initial,
}: {
  colleges?: Record<string, string>;
  initial?: ProfileInitial;
}) {
  // choices mirror the enums defined in models.py
  const skillLevels = { Beginner: "B", Intermediate: "I", Advanced: "A" };
  const genderChoices = { Male: "M", Female: "F" };
  const studentTypes = {
    "Full/Part-Time Undergraduate Student": "1",
    "Full-Time Graduate/Professional School Student": "2",
    "Early Graduate Of Current Year": "3",
    "Non-Enrolled Student": "4",
    "One Year Alumni": "5",
    "Part-Time Graduate Student": "6",
    "International Student": "7",
  };

  const nav = useNavigate();
  const dispatch = useDispatch();

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
    const { error: fieldErrors } = await saveCompetitorProfile({
      skill_level: formData.skill_level,
      school: formData.school,
      gender: formData.gender,
      student_type: formData.student_type,
    });

    if (fieldErrors) {
      const transformed: Record<string, string> = {};
      Object.entries(fieldErrors).forEach(([field, message]) => {
        transformed[field] = Array.isArray(message) ? message[0] : message;
      });
      setErrors(transformed);
      setError(typeof fieldErrors.detail === "string" ? fieldErrors.detail : "Please fix the errors below");
    } else {
      setError("");
      dispatch(setSuccessMsg("Profile completed"));
      nav("/dashboard");
    }
    setLoading(false);
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
              <SignUpError error={error} />
              <Field {...fieldProps} as={Dropdown} name="skill_level" label="Experience Level*" options={skillLevels} required />
              <Field {...fieldProps} as={Dropdown} name="school" label="College*" options={colleges} required />
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col flex-1">
                  <Field {...fieldProps} as={Dropdown} name="gender" label="Gender*" options={genderChoices} errorClass="mt-1" required />
                </div>
                <div className="flex flex-col flex-1">
                  <Field {...fieldProps} as={Dropdown} name="student_type" label="Student Type*" options={studentTypes} errorClass="mt-1" required />
                </div>
              </div>
              <SignUpSubmit loading={loading} handleSubmit={handleSubmit} />
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
