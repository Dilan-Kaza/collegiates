"use client";

import { AuthPanel } from "@components";
import { Field, SignUpError, SignUpSubmit } from "./SignUpComponents";
import type { SignUpFormProps } from "@/types";

export default function SignUpMobile({
  formData, errors, error, loading,
  handleChange, handleBlur, handleEmailBlur, handleSubmit,
}: SignUpFormProps) {
  const fieldProps = { formData, errors, handleChange, handleBlur };

  return (
    <AuthPanel
      bottomLabel="Already have an account? "
      bottomLink="Sign In"
      onSubmit={handleSubmit}
      title="Create an Account"
    >
      <SignUpError error={error} />

      <Field {...fieldProps} name="email" type="email" label="Email*" onBlur={handleEmailBlur} required />
      <Field {...fieldProps} name="password" type="password" label="Password*" minLength={8} required />
      <Field {...fieldProps} name="re_password" type="password" label="Confirm Password*" minLength={8} required />
      <Field {...fieldProps} name="first_name" type="text" label="First Name*" required />
      <Field {...fieldProps} name="last_name" type="text" label="Last Name*" required />

      <SignUpSubmit loading={loading} handleSubmit={handleSubmit} />
    </AuthPanel>
  );
}
