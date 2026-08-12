"use client";

import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
// Labeled form controls: a daisyUI `fieldset` label stack around the matching daisyUI control,
// so borders, focus ring and sizing come from the theme rather than hand-rolled utilities.

interface FieldShellProps {
  label?: ReactNode;
  // Width floor for the field. "min-w-[11rem]" keeps a lone control from collapsing to its
  // label; "min-w-0" lets the caller's own grid or flex track decide the width.
  labelClass?: string;
  error?: string;
  children: ReactNode;
}

// The hint is a sibling *after* the control because daisyUI reveals it through
// `.validator[aria-invalid] ~ .validator-hint` — moving it outside the fieldset,
// as the old callers did, both breaks that selector and loses the theme spacing.
function FieldShell({ label, labelClass = "", error, children }: FieldShellProps) {
  return (
    <label className={`fieldset ${labelClass}`}>
      <span className="fieldset-legend capitalize">{label}</span>
      {children}
      {error && <p className="validator-hint">{error}</p>}
    </label>
  );
}

// daisyUI's `validator` keys off `aria-invalid` as well as `:user-invalid`, so our
// React-held errors can drive the same error border the browser's own validation would.
const invalid = (error?: string) => (error ? true : undefined);

interface ShortAnswerProps extends ComponentProps<"input"> {
  label?: ReactNode;
  labelClass?: string;
  error?: string;
}

function ShortAnswer({ label, labelClass, error, className = "", ...props }: ShortAnswerProps) {
  return (
    <FieldShell label={label} labelClass={labelClass} error={error}>
      <input {...props} aria-invalid={invalid(error)} className={`input validator w-full ${className}`} />
    </FieldShell>
  );
}

// Only differs from ShortAnswer by its input type; kept as its own export
// because `<DatePicker>` reads better at the call sites than a bare type prop.
function DatePicker(props: ShortAnswerProps) {
  return <ShortAnswer type="date" {...props} />;
}

// A password field the user can read back, which is what lets a form ask for the
// password once instead of pairing it with a confirm field. Unlike the other
// controls the `input` class goes on a wrapper, so the toggle sits inside the
// control's border and focus ring — daisyUI styles the nested `input` and grows
// it to fill the space the button leaves.
function PasswordAnswer({ label, labelClass, error, className = "", ...props }: ShortAnswerProps) {
  const [revealed, setRevealed] = useState(false);
  return (
    <FieldShell label={label} labelClass={labelClass} error={error}>
      {/* `validator` sits on the wrapper, not the inner input, so the error border
          follows the whole control; daisyUI matches it via `:has([aria-invalid])`. */}
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
  options: Record<string, string>;
  labelClass?: string;
  error?: string;
}

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
