"use client";

import { AuthPanel, ShortAnswer, MtHeader } from "@components";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import { useParams, useNavigate } from "@/routerCompat";
import { resetPassword } from "@functions/actions";
import { validate, handleFormBlur, handleFormChange } from "@functions/forms";

export default function ResetPassword() {
  const params = useParams();
  const uid = params.uid as string;
  const token = params.token as string;
  const nav = useNavigate();

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleChange = handleFormChange(setFormData, setErrors);
  const handleBlur = handleFormBlur(setErrors, formData);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    const allErrors: Record<string, string> = {};
    ["password", "re_password"].forEach((name) => {
      const err = validate(name, formData[name] || "", formData);
      if (err) allErrors[name] = err;
    });
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }

    setLoading(true);
    const res = await resetPassword({ uid, token, password: formData.password });
    if (res.error) {
      setError(res.error.detail || "This reset link is invalid or has expired.");
    } else {
      setError("");
      setDone(true);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="hidden sm:block"><MtHeader/></div>
      <div
        id="bg-component"
        className="bg-secondary h-screen w-full skew-y-6 absolute -top-[50svh] left-0 -z-20"
      ></div>
      <AuthPanel
        bottomLink="Sign In"
        bottomLabel="Back to "
        onSubmit={handleSubmit}
        title="Reset Password"
      >
        {done ? (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center text-primary font-medium">
              Your password has been updated. You can now sign in.
            </div>
            <button type="button" className="btn btn-primary" onClick={() => nav("/signin")}>
              Sign In
            </button>
          </div>
        ) : (
          <>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            <ShortAnswer
              type="password"
              name="password"
              label="New Password*"
              onChange={handleChange}
              onBlur={handleBlur}
              value={formData.password || ""}
              required
            />
            {errors.password && <div className="text-red-500 mb-4">{errors.password}</div>}
            <ShortAnswer
              type="password"
              name="re_password"
              label="Confirm Password*"
              onChange={handleChange}
              onBlur={handleBlur}
              value={formData.re_password || ""}
              required
            />
            {errors.re_password && <div className="text-red-500 mb-4">{errors.re_password}</div>}
            <div className="flex">
              <div className="flex-col flex-1"></div>
              <div className="flex-box">
                <button
                  onClick={handleSubmit}
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary">
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </>
        )}
      </AuthPanel>
    </>
  );
}
