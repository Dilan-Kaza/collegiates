"use client";

import { AuthPanel, DatePicker, Dropdown } from "@components";
import { Field, SignUpError, SignUpSubmit } from "./SignUpComponents";
import type { SignUpFormProps } from "@/types";

export default function SignUpMobile({
  formData, errors, error, loading,
  colleges, skillLevels, genderChoices, studentTypes,
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
      <Field {...fieldProps} name="first_comp" type="number" label="First Competition Year*" min="1900" max="9999" required />
      <Field {...fieldProps} as={DatePicker} name="grad_date" label="Graduation Date*" required />
      <Field {...fieldProps} as={Dropdown} name="skill_level" label="Experience Level*" options={skillLevels} required />
      <Field {...fieldProps} as={Dropdown} name="school" label="College*" options={colleges} required />
      <Field {...fieldProps} as={Dropdown} name="gender" label="Gender*" options={genderChoices} required />
      <Field {...fieldProps} as={Dropdown} name="student_type" label="Student Type*" options={studentTypes} required />

      <SignUpSubmit loading={loading} handleSubmit={handleSubmit} />
    </AuthPanel>
  );
}
