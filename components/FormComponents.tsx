"use client";

import type { ComponentProps, ReactNode } from "react";
// Labeled form controls. Each one is a daisyUI `fieldset` label stack wrapped
// around the matching daisyUI control (`input` / `textarea` / `select`), so the
// borders, focus ring and sizing all come from the theme rather than from
// hand-rolled utility strings.

interface FieldShellProps {
  label?: ReactNode;
  // Width floor for the whole field. Callers pass "min-w-[11rem]" to keep a lone
  // control from collapsing to its label, or "min-w-0" when their own grid or
  // flex track should decide the width (a narrow column in a split row).
  labelClass?: string;
  children: ReactNode;
}

function FieldShell({ label, labelClass = "", children }: FieldShellProps) {
  return (
    <label className={`fieldset ${labelClass}`}>
      <span className="fieldset-legend capitalize">{label}</span>
      {children}
    </label>
  );
}

interface ShortAnswerProps extends ComponentProps<"input"> {
  label?: ReactNode;
  labelClass?: string;
}

function ShortAnswer({ label, labelClass, className = "", ...props }: ShortAnswerProps) {
  return (
    <FieldShell label={label} labelClass={labelClass}>
      <input {...props} className={`input w-full ${className}`} />
    </FieldShell>
  );
}

// Only differs from ShortAnswer by its input type; kept as its own export
// because `<DatePicker>` reads better at the call sites than a bare type prop.
function DatePicker(props: ShortAnswerProps) {
  return <ShortAnswer type="date" {...props} />;
}

interface LongAnswerProps extends ComponentProps<"textarea"> {
  label?: ReactNode;
  labelClass?: string;
}

function LongAnswer({ label, labelClass, className = "", ...props }: LongAnswerProps) {
  return (
    <FieldShell label={label} labelClass={labelClass}>
      <textarea {...props} className={`textarea w-full min-h-32 resize-y ${className}`} />
    </FieldShell>
  );
}

interface DropdownProps extends ComponentProps<"select"> {
  label?: ReactNode;
  options: Record<string, string>;
  labelClass?: string;
}

function Dropdown({
  label,
  options,
  labelClass = "min-w-[11rem]",
  className = "",
  ...props
}: DropdownProps) {
  return (
    <FieldShell label={label} labelClass={labelClass}>
      <select {...props} className={`select w-full ${className}`}>
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

export { ShortAnswer, LongAnswer, Dropdown, DatePicker };
