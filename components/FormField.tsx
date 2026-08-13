"use client";

import type {
  ChangeEventHandler,
  ElementType,
  FocusEventHandler,
  MouseEventHandler,
} from "react";
import { ShortAnswer } from "./FormComponents";

/**
 * Form-state wiring shared by every form in the app.
 *
 * @remarks
 * The controls themselves live in {@link "components/FormComponents"}; this
 * module connects them to the `formData` / `errors` state pair that the handler
 * factories in {@link "functions/forms"} maintain.
 *
 * @packageDocumentation
 */

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

interface FieldProps {
  /**
   * Which control to render. Defaults to `ShortAnswer`; pass `DatePicker`,
   * `Dropdown`, `LongAnswer`, or `PasswordAnswer` to swap it.
   */
  as?: ElementType;
  /**
   * The field's key in `formData` and `errors`, and the `name` attribute the
   * validation rules are selected by.
   */
  name: string;
  /** The form's values. */
  formData: Record<string, string>;
  /** The form's errors. */
  errors: Record<string, string>;
  handleChange?: ChangeEventHandler<FormControl>;
  handleBlur?: FocusEventHandler<FormControl>;
  /** Anything else is forwarded, so `options` reaches a `Dropdown` untouched. */
  [key: string]: unknown;
}

/**
 * A labeled control wired to the shared form state.
 *
 * @remarks
 * The control renders its own error as a daisyUI `validator-hint`, so callers
 * never have to place or space one themselves.
 *
 * @example
 * ```tsx
 * <Field as={Dropdown} name="school" options={colleges}
 *        formData={formData} errors={errors}
 *        handleChange={onChange} handleBlur={onBlur} />
 * ```
 */
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

/**
 * A form-level error message, for failures with no field to attach them to.
 *
 * @remarks
 * Announced via `role="alert"`. Pair it with `errorMessage` from
 * {@link "functions/actionErrors"}, which falls back to the first field message
 * so nothing an action reports goes unseen.
 *
 * @param error - The message. Renders nothing when absent.
 */
export function FormError({ error }: { error?: string | null }) {
  return error ? <div role="alert" className="text-error mb-4">{error}</div> : null;
}

/** A full-width submit button that disables and relabels itself while in flight. */
export function SubmitButton({
  loading,
  handleSubmit,
  label = "Submit",
  loadingLabel = "Submitting…",
}: {
  /** Disables the button and swaps in `loadingLabel`. */
  loading?: boolean;
  handleSubmit?: MouseEventHandler<HTMLButtonElement>;
  /** Idle text. Defaults to `"Submit"`. */
  label?: string;
  /** In-flight text. Defaults to `"Submitting…"`. */
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
