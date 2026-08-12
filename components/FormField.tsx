"use client";

import type {
  ChangeEventHandler,
  ElementType,
  FocusEventHandler,
  MouseEventHandler,
} from "react";
import { ShortAnswer } from "./FormComponents";
// shared form field wrappers used by the sign-up and profile-setup forms

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

interface FieldProps {
  as?: ElementType;
  name: string;
  formData: Record<string, string>;
  errors: Record<string, string>;
  handleChange?: ChangeEventHandler<FormControl>;
  handleBlur?: FocusEventHandler<FormControl>;
  [key: string]: unknown;
}

// A labeled control (ShortAnswer by default) wired to the shared form state.
// `as={DatePicker}`/`as={Dropdown}` swap the control. The control renders its own
// error as a daisyUI `validator-hint`, so callers don't have to space one themselves.
export function Field({
  as: Control = ShortAnswer,
  name, formData, errors, handleChange, handleBlur, ...props
}: FieldProps) {
  return (
    <Control
      name={name}
      value={formData[name] || ""}
      error={errors[name]}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  );
}

export function FormError({ error }: { error?: string | null }) {
  return error ? <div role="alert" className="text-error mb-4">{error}</div> : null;
}

export function SubmitButton({
  loading,
  handleSubmit,
  label = "Submit",
  loadingLabel = "Submitting…",
}: {
  loading?: boolean;
  handleSubmit?: MouseEventHandler<HTMLButtonElement>;
  label?: string;
  loadingLabel?: string;
}) {
  return (
    <button
      onClick={handleSubmit}
      type="submit"
      disabled={loading}
      className="btn btn-block btn-primary"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
