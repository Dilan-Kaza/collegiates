"use client";

import type { ComponentProps, ReactNode } from "react";
// labeled form controls

interface ShortAnswerProps extends ComponentProps<"input"> {
  label?: ReactNode;
}

function ShortAnswer({ label, ...props }: ShortAnswerProps) {
  return (
    <>
      <label className="flex flex-col gap-2">
        <span className="capitalize text-sm">{label}</span>
        <div
          className="transition-outline ease-in-out duration-100 border border-brown/20
        focus-within:border-transparent focus-within:outline-2 focus-within:outline-dark
        rounded-md py-[.5px] px-2"
        >
          <input {...props} className="py-2 w-full" />
        </div>
      </label>
    </>
  );
}

interface DropdownProps extends ComponentProps<"select"> {
  label?: ReactNode;
  options: Record<string, string>;
}

function Dropdown({ label, options, ...props }: DropdownProps) {
  const optionsList = Object.entries(options);

  return (
    <>
      <label className="min-w-[11rem] flex flex-col gap-2">
        <span className="capitalize text-sm">{label}</span>
        <div className="relative flex flex-col gap-2 transition-outline ease-in-out duration-200 border border-gray-300 focus-within:outline-2 focus-within:outline-primary rounded-md py-[10px] px-2">
          <select {...props}>
            <option value="" disabled hidden></option>
            {optionsList.map((optionPair, index) => (
              <option value={optionPair[1]} key={index}>
                {optionPair[0]}
              </option>
            ))}
          </select>
        </div>
      </label>
    </>
  );
}

interface DatePickerProps extends ComponentProps<"input"> {
  label?: ReactNode;
}

function DatePicker({ label, ...props }: DatePickerProps) {
  return (
    <>
      <label className="flex flex-col gap-2">
        <span className="capitalize text-sm">{label}</span>
        <div className="transition-outline ease-in-out duration-200 border border-gray-300 focus-within:outline-2 focus-within:outline-primary rounded-md py-2 px-2">
          <input
            type="date"
            {...props}
          />
        </div>
      </label>
    </>
  );
}

export { ShortAnswer, Dropdown, DatePicker };
