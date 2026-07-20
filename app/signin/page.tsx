"use client";

import { AuthPanel, ShortAnswer, MtHeader } from "@components";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import { loginAction } from "@functions/actions";
import { useForwardDashboard } from "@functions";
import { setSuccessMsg } from "@slices";
import { clearSessionCache } from "@functions/sessionCache";
import { validate, handleFormBlur, handleFormChange } from "@functions/forms";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";

export default function SignIn() {

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dispatch = useDispatch();
  const router = useRouter();

  const handleChange = handleFormChange(setFormData, setErrors);

  const handleBlur = handleFormBlur(setErrors);


  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    const requiredFields = ["email", "password"];

    const allErrors: Record<string, string> = {};
    requiredFields.forEach((name) => {
      const error = validate(name, formData[name]);
      if (error) allErrors[name] = error;
    });

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }

    setLoading(true);

    // The loginAction server action sets the Auth.js session cookie server-side
    // (no /api/auth endpoint). router.refresh() then re-runs the layout, which
    // re-seeds SessionProvider so useSession/useForwardDashboard pick up the new
    // session and navigate to the dashboard.
    const res = await loginAction({
      email: formData.email,
      password: formData.password,
    });

    if (res.error) {
      setError("Sign In failed");
    } else {
      setError("");
      clearSessionCache("currentUser");
      dispatch(setSuccessMsg("Sign In Successful"));
      router.refresh();
    }
    setLoading(false);
  };

  useForwardDashboard();

  return (
    <>
      <div className="hidden sm:block"><MtHeader/></div>
      <div
        id="bg-component"
        className="bg-secondary h-screen w-full skew-y-6 absolute -top-[50svh] left-0 -z-20"
      ></div>
      <AuthPanel
        bottomLink="Sign Up"
        bottomLabel="Don't have an account? "
        onSubmit={handleSubmit}
        title="Sign In"
      >
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <ShortAnswer
          type="email"
          name="email"
          label="Email*"
          onChange={handleChange}
          onBlur={handleBlur}
          value={formData.email || ""}
          required
        />
        {errors.email && <div className="text-red-500 mb-4">Invalid email address</div>}
        <ShortAnswer
          type="password"
          name="password"
          label="Password*"
          onChange={handleChange}
          value={formData.password || ""}
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
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </div>
      </AuthPanel>
    </>
  );
}
