"use client";

import { AuthPanel, ShortAnswer, MtHeader } from "@components";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import { useParams, Link } from "@/routerCompat";
import { setInitialPassword } from "@functions/actions";
import { validate, handleFormBlur, handleFormChange } from "@functions/forms";
// School account invitation — chooses the first password and activates the
// account in one submit. Mirrors reset-password, which redeems a "P" token;
// this one redeems the "S" token from createSchoolAccount's email.

export default function SetPassword() {
  const params = useParams();
  const uid = params.uid as string;
  const token = params.token as string;

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
    const res = await setInitialPassword({ uid, token, password: formData.password });
    if (res.error) {
      setError(res.error.detail || "This activation link is invalid or has expired.");
    } else {
      setError("");
      setDone(true);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="hidden sm:block"><MtHeader/></div>
      <AuthPanel
        bottomLink="Sign In"
        bottomLabel="Back to "
        onSubmit={handleSubmit}
        title="Set Your Password"
      >
        {done ? (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center text-primary font-medium">
              Your account is active. You can now sign in.
            </div>
            <Link to="/signin" className="btn btn-primary">
              Sign In
            </Link>
          </div>
        ) : (
          <>
            {error && <div role="alert" className="text-error mb-4">{error}</div>}
            <div className="text-center text-gray-600 mb-4">
              Choose a password to activate your school account.
            </div>
            <ShortAnswer
              type="password"
              name="password"
              label="Password*"
              onChange={handleChange}
              onBlur={handleBlur}
              value={formData.password || ""}
              error={errors.password}
              required
            />
            <ShortAnswer
              type="password"
              name="re_password"
              label="Confirm Password*"
              onChange={handleChange}
              onBlur={handleBlur}
              value={formData.re_password || ""}
              error={errors.re_password}
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
                  {loading ? "Saving..." : "Set Password"}
                </button>
              </div>
            </div>
          </>
        )}
      </AuthPanel>
    </>
  );
}
