"use client";

import { MtHeader, AuthPanel, Field, FormError, SubmitButton } from "@components";
import { useState } from "react";
import type { FocusEvent, SyntheticEvent } from "react";
import { checkEmail, registerUser } from "@functions/actions";
import { useForwardDashboard } from "@functions";
import { useNavigate } from "@/routerCompat";
import { useDispatch } from "react-redux";
import { setSuccessMsg } from "@slices";
import { validate, handleFormBlur, handleFormChange } from "@functions/forms";
// sign-up page — a single responsive AuthPanel form (account fields only)

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export default function SignUp() {
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

    // Sign-up collects account fields only; the competitor profile is created
    // in the separate /profile/setup step after the user first signs in.
    const requiredFields = ["email", "password", "re_password", "first_name", "last_name"];

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

    const payload = {
      email: formData.email,
      password: formData.password,
      re_password: formData.re_password,
      first_name: formData.first_name,
      last_name: formData.last_name,
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


  const fieldProps = { formData, errors, handleChange, handleBlur };

  return (
    <div className="overflow-x-hidden min-h-screen">
      <div className="hidden sm:block"><MtHeader/></div>
      <div
        id="bg-component"
        className="bg-primary h-screen w-full skew-y-10 absolute -top-[60svh] left-0 -z-20"
      ></div>
      <div className="mx-4">
        <AuthPanel
          bottomLabel="Already have an account? "
          bottomLink="Sign In"
          onSubmit={handleSubmit}
          title="Create an Account"
        >
          <FormError error={error} />
          <Field {...fieldProps} name="email" type="email" label="Email*" onBlur={handleEmailBlur} required />
          <Field {...fieldProps} name="password" type="password" label="Password*" minLength={8} required />
          <Field {...fieldProps} name="re_password" type="password" label="Confirm Password*" minLength={8} required />
          <div className="flex gap-4">
            <div className="flex flex-col flex-1">
              <Field {...fieldProps} name="first_name" type="text" label="First Name*" errorClass="mt-1" required />
            </div>
            <div className="flex flex-col flex-1">
              <Field {...fieldProps} name="last_name" type="text" label="Last Name*" errorClass="mt-1" required />
            </div>
          </div>
          <SubmitButton loading={loading} handleSubmit={handleSubmit} label="Create account" />
        </AuthPanel>
      </div>
    </div>
  );
}
