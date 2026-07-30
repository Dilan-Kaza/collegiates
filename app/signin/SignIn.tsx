"use client";

import { AuthPanel, ShortAnswer, MtHeader } from "@components";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import { loginAction, resendActivation } from "@functions/actions";
import { setSuccessMsg } from "@slices";
import { clearSessionCache } from "@functions/sessionCache";
import { validate, handleFormBlur, handleFormChange } from "@functions/forms";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { Link } from "@/routerCompat";

export default function SignIn() {

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inactive, setInactive] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

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
    setInactive(false);
    setResendState("idle");

    // The loginAction server action sets the Auth.js session cookie server-side
    // (no /api/auth endpoint). router.refresh() then re-runs app/signin/page.tsx
    // server-side, whose requireGuest() check now finds the new session and
    // redirects to /dashboard — no client-side redirect needed here.
    const res = await loginAction({
      email: formData.email,
      password: formData.password,
    });

    if (res.inactive) {
      setError("");
      setInactive(true);
    } else if (res.error) {
      setError("Sign In failed");
    } else {
      setError("");
      clearSessionCache("currentUser");
      dispatch(setSuccessMsg("Sign In Successful"));
      router.refresh();
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResendState("sending");
    await resendActivation({ email: formData.email });
    setResendState("sent");
  };

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
        {inactive && (
          <div className="text-amber-600 mb-4">
            Your account isn&apos;t activated yet. Check your email for the activation link.
            {resendState === "sent" ? (
              <div className="mt-1">If an account with that email exists, a new activation link was sent.</div>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState === "sending"}
                className="block mt-1 font-bold text-primary underline"
              >
                {resendState === "sending" ? "Sending..." : "Resend activation email"}
              </button>
            )}
          </div>
        )}
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
          <div className="flex-col flex-1">
            <Link to="/forgot-password" className="text-sm text-primary font-medium">
              Forgot password?
            </Link>
          </div>
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
