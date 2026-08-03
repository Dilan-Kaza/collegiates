"use client";

import { MtHeader, AuthPanel, Field, FormError, SubmitButton } from "@components";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import { loginAction } from "@functions/actions";
import type { SignedInUser } from "@functions/actions";
import { useForwardDashboard } from "@functions";
import { useNavigate } from "@/routerCompat";
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

    // loginAction sets the session cookie server-side and returns the user; the
    // navigation below re-runs the root layout against that cookie, which is
    // what re-seeds SessionProvider. No router.refresh() first — that rendered
    // /signin server-side only to leave it, costing a second RSC round trip.
    try {
      const res = await loginAction({
        email: formData.email,
        password: formData.password,
      });

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
        <Field {...fieldProps} name="email" type="email" label="Email*" required />
        <Field {...fieldProps} name="password" type="password" label="Password*" required />
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
