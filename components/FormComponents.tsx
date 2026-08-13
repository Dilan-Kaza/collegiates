"use client";

import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";

/**
 * Labeled form controls.
 *
 * @remarks
 * Each is a daisyUI `fieldset` label stack wrapped around the matching daisyUI
 * control, so borders, focus ring, spacing, and error styling all come from the
 * theme rather than hand-rolled utilities.
 *
 * Errors are React-held rather than native. daisyUI's `validator` class keys off
 * `aria-invalid` as well as `:user-invalid`, so passing an `error` drives exactly
 * the same error border the browser's own validation would.
 *
 * @packageDocumentation
 */

interface FieldShellProps {
  label?: ReactNode;
  /**
   * Width floor for the field. `"min-w-[11rem]"` keeps a lone control from
   * collapsing to its label; `"min-w-0"` lets the caller's own grid or flex
   * track decide.
   */
  labelClass?: string;
  error?: string;
  children: ReactNode;
}

// The hint is a sibling *after* the control: daisyUI reveals it through
// `.validator[aria-invalid] ~ .validator-hint`.
function FieldShell({ label, labelClass = "", error, children }: FieldShellProps) {
  return (
    <label className={`fieldset ${labelClass}`}>
      <span className="fieldset-legend capitalize">{label}</span>
      {children}
      {error && <p className="validator-hint">{error}</p>}
    </label>
  );
}

const invalid = (error?: string) => (error ? true : undefined);

interface ShortAnswerProps extends ComponentProps<"input"> {
  label?: ReactNode;
  labelClass?: string;
  error?: string;
}

/** A single-line text input with a label and an error hint. */
function ShortAnswer({ label, labelClass, error, className = "", ...props }: ShortAnswerProps) {
  return (
    <FieldShell label={label} labelClass={labelClass} error={error}>
      <input {...props} aria-invalid={invalid(error)} className={`input validator w-full ${className}`} />
    </FieldShell>
  );
}

/**
 * A date input.
 *
 * @remarks
 * Only differs from {@link ShortAnswer} by its `type`, but kept as its own
 * export because `<DatePicker>` reads better at a call site than a bare type
 * prop. Its value is `yyyy-mm-dd`, which round-trips with `settingsDateInput`
 * and `parseSettingsDate`.
 */
function DatePicker(props: ShortAnswerProps) {
  return <ShortAnswer type="date" {...props} />;
}

/**
 * A password field with a show/hide toggle.
 *
 * @remarks
 * Being able to read the password back is what lets a form ask for it **once**
 * instead of pairing it with a confirm field — which is why sign-up has no
 * second password input.
 *
 * Unlike the other controls, the `input` class goes on a wrapper rather than the
 * `<input>` itself, so the toggle sits inside the control's border and focus
 * ring; daisyUI styles the nested input and grows it to fill the space the
 * button leaves. `validator` goes on that wrapper too, so the error border
 * follows the whole control — daisyUI matches it via `:has([aria-invalid])`.
 */
function PasswordAnswer({ label, labelClass, error, className = "", ...props }: ShortAnswerProps) {
  const [revealed, setRevealed] = useState(false);
  return (
    <FieldShell label={label} labelClass={labelClass} error={error}>
      <div className={`input validator w-full ${className}`}>
        <input {...props} aria-invalid={invalid(error)} type={revealed ? "text" : "password"} />
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          aria-pressed={revealed}
          aria-label={revealed ? "Hide password" : "Show password"}
          onClick={() => setRevealed((prev) => !prev)}
        >
          {revealed ? "Hide" : "Show"}
        </button>
      </div>
    </FieldShell>
  );
}

interface LongAnswerProps extends ComponentProps<"textarea"> {
  label?: ReactNode;
  labelClass?: string;
  error?: string;
}

/** A multi-line textarea, vertically resizable. */
function LongAnswer({ label, labelClass, error, className = "", ...props }: LongAnswerProps) {
  return (
    <FieldShell label={label} labelClass={labelClass} error={error}>
      <textarea
        {...props}
        aria-invalid={invalid(error)}
        className={`textarea validator w-full min-h-32 resize-y ${className}`}
      />
    </FieldShell>
  );
}

interface DropdownProps extends ComponentProps<"select"> {
  label?: ReactNode;
  /**
   * Display label → submitted value. Matches the `*_CHOICES` constants in
   * {@link "lib/api/enums"} and the college map's `{ name: id }`.
   */
  options: Record<string, string>;
  labelClass?: string;
  error?: string;
}

/**
 * A `<select>` built from a label→value map.
 *
 * @remarks
 * Renders a hidden, disabled blank option first, so an unset field shows empty
 * rather than silently defaulting to whichever option happens to be first.
 */
function Dropdown({
  label,
  options,
  labelClass = "min-w-[11rem]",
  error,
  className = "",
  ...props
}: DropdownProps) {
  return (
    <FieldShell label={label} labelClass={labelClass} error={error}>
      <select {...props} aria-invalid={invalid(error)} className={`select validator w-full ${className}`}>
        <option value="" disabled hidden></option>
        {Object.entries(options).map(([text, value]) => (
          <option value={value} key={value}>
            {text}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export { ShortAnswer, LongAnswer, Dropdown, DatePicker, PasswordAnswer };
