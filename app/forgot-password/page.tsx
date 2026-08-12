"use client";

import { AuthPanel, ShortAnswer, MtHeader } from "@components";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import { requestPasswordReset } from "@functions/actions";
import { validate, handleFormBlur, handleFormChange } from "@functions/forms";

export default function ForgotPassword() {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleChange = handleFormChange(setFormData, setErrors);
  const handleBlur = handleFormBlur(setErrors);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    const error = validate("email", formData.email || "");
    if (error) {
      setErrors({ email: error });
      return;
    }

    setLoading(true);
    // requestPasswordReset always returns the same generic message, whether or
    // not the email matched an account, so this can't be used to probe which
    // emails are registered.
    await requestPasswordReset({ email: formData.email });
    setSent(true);
    setLoading(false);
  };

  return (
    <>
      <div className="hidden sm:block"><MtHeader/></div>
      <AuthPanel
        bottomLink="Sign In"
        bottomLabel="Back to "
        onSubmit={handleSubmit}
        title="Forgot Password"
      >
        {sent ? (
          <div className="text-center text-primary font-medium">
            If an account with that email exists, a reset link was sent.
          </div>
        ) : (
          <>
            <ShortAnswer
              type="email"
              name="email"
              label="Email*"
              onChange={handleChange}
              onBlur={handleBlur}
              value={formData.email || ""}
              error={errors.email && "Invalid email address"}
              required
            />
            <div className="flex">
              <div className="flex-col flex-1"></div>
              <div className="flex-box">
                <button
                  onClick={handleSubmit}
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary">
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </div>
          </>
        )}
      </AuthPanel>
    </>
  );
}
