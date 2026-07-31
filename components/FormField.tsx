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
  errorClass?: string;
  [key: string]: unknown;
}

// Renders a labeled control (ShortAnswer by default) wired to the shared form
// state, followed by its validation error. Pass `as={DatePicker}` / `as={Dropdown}`
// for the other control types. `errorClass` tunes the error spacing per layout.
export function Field({
  as: Control = ShortAnswer,
  name, formData, errors, handleChange, handleBlur,
  errorClass = "-mt-2", ...props
}: FieldProps) {
  return (
    <>
      <Control
        name={name}
        value={formData[name] || ""}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
      {errors[name] && <p className={`text-red-500 text-sm ${errorClass}`}>{errors[name]}</p>}
    </>
  );
}

export function FormError({ error }: { error?: string | null }) {
  return error ? <div className="text-red-500 mb-4">{error}</div> : null;
}

export function SubmitButton({
  loading,
  handleSubmit,
  label = "Submit",
}: {
  loading?: boolean;
  handleSubmit?: MouseEventHandler<HTMLButtonElement>;
  label?: string;
}) {
  return (
    <button
      onClick={handleSubmit} type="submit"
      disabled={loading} className="btn btn-block btn-primary"
    >
      {loading ? "Submitting…" : label}
    </button>
  );
}
