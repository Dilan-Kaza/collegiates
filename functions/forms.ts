"use client";

import type {
  ChangeEventHandler,
  FocusEventHandler,
  Dispatch,
  SetStateAction,
} from "react";

/**
 * Client-side form validation and controlled-input handler factories.
 *
 * @remarks
 * The rules here are a **convenience, not a boundary**: every one of them is
 * re-checked in the server action that receives the form. Nothing may be trusted
 * because it passed validation on this side.
 *
 * @packageDocumentation
 */

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type FormErrors = Record<string, string>;
type FormData = Record<string, string>;

/**
 * Validates one field by name.
 *
 * @param name - The field's `name` attribute, which selects the rule. An unknown
 * name is valid by default, so adding a field does not silently block a form.
 * @param value - The field's current value.
 * @param formData - The rest of the form, for rules that compare fields —
 * `re_password` needs `password`.
 * @returns The error message, or `""` when the value is acceptable.
 */
const validate = (name: string, value: string, formData: { password?: string } = {}): string => {
  switch (name) {
    case "email":
      if (!value) return "Email is required";
      if (!/\S+@\S+\.\S+/.test(value)) return "Invalid email address";
      return "";
    case "password":
      if (!value) return "Password is required";
      if (value.length < 8) return "Password must be at least 8 characters";
      return "";
    case "old_password":
      if (!value) return "Current password is required";
      return "";
    case "re_password":
      if (!value) return "Please confirm your password";
      if (value !== formData.password) return "Passwords do not match";
      return "";
    case "first_name":
      if (!value) return "Required";
      return "";
    case "last_name":
      if (!value) return "Required";
      return "";
    case "school":
      if (!value) return "Please select a college";
      return "";
    case "skill_level":
      if (!value) return "Please select an experience level";
      return "";
    case "gender":
      if (!value) return "Please select a gender";
      return "";
    case "student_type":
      if (!value) return "Please select a class eligibility";
      return "";
    default:
      return "";
  }
};

/**
 * Builds an `onChange` handler that writes the field into form state and clears
 * its error.
 *
 * @remarks
 * Errors are cleared on change but only *set* on blur — see
 * {@link handleFormBlur}. Validating as someone types would flag a half-typed
 * email on its second character.
 *
 * @param setData - State setter for the form's values.
 * @param setErrors - State setter for the form's errors.
 */
function handleFormChange(
  setData: Dispatch<SetStateAction<FormData>>,
  setErrors: Dispatch<SetStateAction<FormErrors>>,
): ChangeEventHandler<FormControl> {
  return (e) => {
    const { name, value } = e.target;
    setData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: "",
    }));
  };
}

/**
 * Builds an `onBlur` handler that validates the field it just left.
 *
 * @param setErrors - State setter for the form's errors.
 * @param formData - The rest of the form, for cross-field rules.
 */
function handleFormBlur(
  setErrors: Dispatch<SetStateAction<FormErrors>>,
  formData: { password?: string } = { password: "" },
): FocusEventHandler<FormControl> {
  return (e) => {
    const { name, value } = e.target;
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: validate(name, value, formData),
    }));
  };
}

export { validate, handleFormChange, handleFormBlur };
