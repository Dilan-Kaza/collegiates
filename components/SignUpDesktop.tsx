"use client";

import { AuthPanelWide } from "@components";
import { Field, SignUpError, SignUpSubmit } from "./SignUpComponents";
import type { SignUpFormProps } from "@/types";

export default function SignUpDesktop({ formData, errors, error, loading, handleChange, handleBlur, handleEmailBlur, handleSubmit }: SignUpFormProps) {
  const fieldProps = { formData, errors, handleChange, handleBlur };

  return (
    <AuthPanelWide
      bottomLabel="Already have an account? "
      bottomLink="Sign In"
      onSubmit={handleSubmit}
      title="Create an Account"
    >
      <div className="flex flex-col gap-4">
        <SignUpError error={error} />
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
      </div>
      <div className="content-center">
        <SignUpSubmit loading={loading} handleSubmit={handleSubmit} />
      </div>
    </AuthPanelWide>
  );
}
