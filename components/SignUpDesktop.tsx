"use client";

import { AuthPanelWide, DatePicker, Dropdown } from "@components";
import { Field, SignUpError, SignUpSubmit } from "./SignUpComponents";
import type { SignUpFormProps } from "@/types";

export default function SignUpDesktop({ formData, errors, error, loading, colleges, skillLevels, genderChoices, studentTypes, handleChange, handleBlur, handleEmailBlur, handleSubmit }: SignUpFormProps) {
  const fieldProps = { formData, errors, handleChange, handleBlur };

  return (
    <AuthPanelWide
      bottomLabel="Already have an account? "
      bottomLink="Sign In"
      onSubmit={handleSubmit}
      title="Create an Account"
    >
      <div className="flex row gap-15">
        <div className="flex flex-col flex-1 gap-4">
          <SignUpError error={error} />
          <Field {...fieldProps} name="email" type="email" label="Email*" onBlur={handleEmailBlur} required />
          <Field {...fieldProps} name="password" type="password" label="Password*" minLength={8} required />
          <Field {...fieldProps} name="re_password" type="password" label="Confirm Password*" minLength={8} required />
        </div>
        <div className="flex flex-col flex-1 gap-4">
          <div className="flex gap-4">
            <div className="flex flex-col flex-1">
              <Field {...fieldProps} name="first_name" type="text" label="First Name*" errorClass="mt-1" required />
            </div>
            <div className="flex flex-col flex-1">
              <Field {...fieldProps} name="last_name" type="text" label="Last Name*" errorClass="mt-1" required />
            </div>
          </div>
          <div className="flex justify-between gap-4">
            <div className="flex flex-col flex-1">
              <Field {...fieldProps} name="first_comp" type="number" label="First Competition Year*" min="1900" max="9999" className="w-40" errorClass="mt-1" required />
            </div>
            <div className="flex flex-col flex-1">
              <Field {...fieldProps} as={DatePicker} name="grad_date" label="Graduation Date*" className="w-40" errorClass="mt-1" required />
            </div>
          </div>
          <Field {...fieldProps} as={Dropdown} name="skill_level" label="Experience Level*" options={skillLevels} required />
          <Field {...fieldProps} as={Dropdown} name="school" label="College*" options={colleges} required />
          <div className="flex justify-between gap-2">
            <div className="flex flex-col flex-1">
              <Field {...fieldProps} as={Dropdown} name="gender" label="Gender*" options={genderChoices} errorClass="mt-1" required />
            </div>
            <div className="flex flex-col w-48">
              <Field {...fieldProps} as={Dropdown} name="student_type" label="Student Type*" options={studentTypes} errorClass="mt-1" required />
            </div>
          </div>
        </div>
      </div>
      <div className="content-center">
        <SignUpSubmit loading={loading} handleSubmit={handleSubmit} />
      </div>
    </AuthPanelWide>
  );
}
