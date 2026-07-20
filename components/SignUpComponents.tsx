"use client";

import type {
  ChangeEventHandler,
  ElementType,
  FocusEventHandler,
  MouseEventHandler,
} from "react";
import { ShortAnswer } from "./FormComponents";
// shared sign-up form field wrappers

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

// Renders a labeled control (ShortAnswer by default) wired to the shared sign-up
// form state, followed by its validation error. Pass `as={DatePicker}` / `as={Dropdown}`
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

export function SignUpError({ error }: { error?: string | null }) {
  return error ? <div className="text-red-500 mb-4">{error}</div> : null;
}

export function SignUpSubmit({ loading, handleSubmit }: { loading?: boolean; handleSubmit?: MouseEventHandler<HTMLButtonElement> }) {
  return (
    <button
      onClick={handleSubmit} type="submit"
      disabled={loading} className="btn btn-block btn-primary"
    >
      {loading ? "Signing up..." : "Submit"}
    </button>
  );
}
