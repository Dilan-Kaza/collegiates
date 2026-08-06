"use client";

import type { ComponentProps, ReactNode } from "react";
// Labeled form controls: a daisyUI `fieldset` label stack around the matching daisyUI control,
// so borders, focus ring and sizing come from the theme rather than hand-rolled utilities.

interface FieldShellProps {
  label?: ReactNode;
  // Width floor for the field. "min-w-[11rem]" keeps a lone control from collapsing to its
  // label; "min-w-0" lets the caller's own grid or flex track decide the width.
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
