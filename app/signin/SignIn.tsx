"use client";

import { MtHeader, AuthPanel, Field, FormError, SubmitButton } from "@components";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import { loginAction, resendActivation } from "@functions/actions";
import type { SignedInUser } from "@functions/actions";
import { useForwardDashboard } from "@functions";
import { useNavigate, Link } from "@/routerCompat";
import { useAppDispatch } from "@/store/hooks";
import { setSuccessMsg } from "@slices";
import { clearSessionCache } from "@functions/sessionCache";
import { cacheKeys } from "@functions";
import { validate, handleFormChange, handleFormBlur } from "@functions/forms";
// sign-in page — a single AuthPanel form (email + password only)

// Where a freshly signed-in user lands, from what loginAction returns. Mirrors
// /competitor's server gates so they arrive directly instead of via a redirect.
function landingRoute(user: SignedInUser): string {
  if (user.can_access_organizer) return "/organizer";
  if (!user.has_profile || (user.reg_year != null && user.profile_reg_year !== user.reg_year)) {
    return "/competitor/profile";
  }
  return "/competitor";
}

export default function SignIn() {
  const nav = useNavigate();
  const dispatch = useAppDispatch();

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Set once this page has signed a user in and routed them itself, which
  // switches off the generic "authenticated -> /competitor" forwarding below.
  const [signedIn, setSignedIn] = useState(false);
  const [inactive, setInactive] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  const handleChange = handleFormChange(setFormData, setErrors);
  const handleBlur = handleFormBlur(setErrors, formData);
  const fieldProps = { formData, errors, handleChange, handleBlur };

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    const requiredFields = ["email", "password"];

    const allErrors: Record<string, string> = {};
    requiredFields.forEach((name) => {
      const err = validate(name, formData[name], formData);
      if (err) allErrors[name] = err;
    });

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }

    setLoading(true);
    setInactive(false);
    setResendState("idle");

    // loginAction sets the session cookie server-side and returns the user; the navigation below
    // re-runs the root layout against that cookie, re-seeding SessionProvider. No router.refresh().
    try {
      const res = await loginAction({
        email: formData.email,
        password: formData.password,
      });

      if (res.inactive) {
        setError("");
        setInactive(true);
        return;
      }

      if (res.error || !res.user) {
        // loginAction distinguishes bad credentials from the database being
        // unreachable, so show what it said rather than one generic line.
        setError(res.error || "Sign In failed");
        return;
      }
      setError("");
      clearSessionCache(cacheKeys.currentUser);
      dispatch(setSuccessMsg("Sign In Successful"));
      setSignedIn(true);
      nav(landingRoute(res.user));
    } catch (err) {
      console.error("[loginAction]", err);
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendState("sending");
    await resendActivation({ email: formData.email });
    setResendState("sent");
  };

  // Fallback for reaching /signin while already authenticated. Suspended once
  // this page has signed someone in and picked their destination.
  useForwardDashboard(!signedIn);

  return (
    <>
      <div className="hidden sm:block"><MtHeader /></div>
      <div
        id="bg-component"
        className="bg-secondary h-screen w-full skew-y-6 absolute -top-[50svh] left-0 -z-20"
      />
      <AuthPanel
        bottomLabel="Don't have an account? "
        bottomLink="Sign Up"
        onSubmit={handleSubmit}
        title="Sign In"
      >
        <FormError error={error} />
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
        <Field {...fieldProps} name="email" type="email" label="Email*" required />
        <Field {...fieldProps} name="password" type="password" label="Password*" required />
        <div className="flex items-center">
          <div className="flex-1">
            <Link to="/forgot-password" className="text-sm text-primary font-medium">
              Forgot password?
            </Link>
          </div>
        </div>
        <SubmitButton
          loading={loading}
          handleSubmit={handleSubmit}
          label="Sign In"
          loadingLabel="Signing in..."
        />
      </AuthPanel>
    </>
  );
}
