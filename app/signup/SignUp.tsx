"use client";

import { MtHeader, SignUpMobile, SignUpDesktop } from "@components";
import { useState } from "react";
import type { FocusEvent, SyntheticEvent } from "react";
import { checkEmail, registerUser } from "@functions/actions";
import { useForwardDashboard } from "@functions";
import { useNavigate } from "@/routerCompat";
import { useDispatch } from "react-redux";
import { setSuccessMsg } from "@slices";
import { validate, handleFormBlur, handleFormChange } from "@functions/forms";
// sign-up page (mobile + desktop layouts)

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export default function SignUp({ colleges = {} }: { colleges?: Record<string, string> }) {
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

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dispatch = useDispatch();

  const checkEmailExists = async (email: string) => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return;
    try {
      const { exists } = await checkEmail(email);
      if (exists) {
        setErrors((prev) => ({ ...prev, email: "An account with this email already exists" }));
      }
    } catch (err) {
      console.warn("Could not check email", err);
    }
  };

  const handleChange = handleFormChange(setFormData,setErrors);
  const handleBlur = handleFormBlur(setErrors, formData);

  const handleEmailBlur = (e: FocusEvent<FormControl>) => {
    const { name, value } = e.target;
            setErrors((prevErrors) => ({
                ...prevErrors,
                [name]: validate(name, value),
            }));
    if (name === "email") checkEmailExists(value);
  };

  useForwardDashboard();


  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    const requiredFields = ["email", "password", "re_password", "first_name", "last_name", "first_comp", "grad_date", "skill_level", "school", "gender", "student_type"];

    const allErrors: Record<string, string> = {};
    requiredFields.forEach((name) => {
      const error = validate(name, formData[name], formData);
      if (error) allErrors[name] = error;
    });

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }

    setLoading(true);

    // Prepare JSON payload
    const payload = {
      ...formData
    };

    const { error: fieldErrors } = await registerUser(payload);
    if (fieldErrors) {
      const transformedErrors: Record<string, string> = {};
      Object.entries(fieldErrors).forEach(([field, message]) => {
        transformedErrors[field] = Array.isArray(message) ? message[0] : message;
      });
      setErrors(transformedErrors);
      setError("Please fix the errors below");
    } else {
      setError("");
      dispatch(setSuccessMsg("Account created successfully"));
      nav('/signin');
    }
    setLoading(false);
  };


  return (
    <div className="overflow-x-hidden min-h-screen">
      <div className="hidden sm:block"><MtHeader/></div>
      <div
        id="bg-component"
        className="bg-primary h-screen w-full skew-y-10 absolute -top-[60svh] left-0 -z-20"
      ></div>
      <div className="sm:hidden mx-4">
        <SignUpMobile
          formData={formData} errors={errors} error={error} loading={loading}
          colleges={colleges} skillLevels={skillLevels} genderChoices={genderChoices} studentTypes={studentTypes}
          handleChange={handleChange} handleBlur={handleBlur} handleEmailBlur={handleEmailBlur} handleSubmit={handleSubmit}
        />
      </div>
      <div className="hidden sm:block">
        <SignUpDesktop
          formData={formData} errors={errors} error={error} loading={loading}
          colleges={colleges} skillLevels={skillLevels} genderChoices={genderChoices} studentTypes={studentTypes}
          handleChange={handleChange} handleBlur={handleBlur} handleEmailBlur={handleEmailBlur} handleSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
