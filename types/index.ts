// Shared UI-facing types (not Prisma/DTO shapes — those live in lib/api.ts).

import type { ChangeEventHandler, FocusEventHandler, SyntheticEvent } from "react";

// A single event row as tracked by the registration UI while a competitor
// builds up their selection.
export interface RegEventItem {
  event_code: string;
  nandu_str?: string;
}

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

// Props shared by the desktop and mobile sign-up form layouts.
export interface SignUpFormProps {
  formData: Record<string, string>;
  errors: Record<string, string>;
  error?: string | null;
  loading?: boolean;
  colleges: Record<string, string>;
  skillLevels: Record<string, string>;
  genderChoices: Record<string, string>;
  studentTypes: Record<string, string>;
  handleChange: ChangeEventHandler<FormControl>;
  handleBlur: FocusEventHandler<FormControl>;
  handleEmailBlur: FocusEventHandler<FormControl>;
  handleSubmit: (e: SyntheticEvent) => void;
}
