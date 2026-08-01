"use client";

import { AuthPanel, ShortAnswer, MtHeader } from "@components";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import { loginAction } from "@functions/actions";
import type { SignedInUser } from "@functions/actions";
import { useForwardDashboard } from "@functions";
import { setSuccessMsg } from "@slices";
import { clearSessionCache } from "@functions/sessionCache";
import { validate, handleFormBlur, handleFormChange } from "@functions/forms";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useNavigate } from "@/routerCompat";

// Where a freshly signed-in user lands, from what loginAction returns. Mirrors
// /dashboard's server gates so they arrive directly instead of via a redirect.
function landingRoute(user: SignedInUser): string {
  if (user.can_access_organizer) return "/organizer";
  if (!user.has_profile || (user.reg_year != null && user.profile_reg_year !== user.reg_year)) {
    return "/profile/setup";
  }
  return "/dashboard";
}

export default function SignIn() {

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Set once this page has signed a user in and routed them itself, which
  // switches off the generic "authenticated -> /dashboard" forwarding below.
  const [signedIn, setSignedIn] = useState(false);

  const dispatch = useDispatch();
  const router = useRouter();
  const nav = useNavigate();

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

    // loginAction sets the session cookie server-side and returns the user.
    // router.refresh() re-runs the layout, re-seeding SessionProvider.
    const res = await loginAction({
      email: formData.email,
      password: formData.password,
    });

    if (res.error || !res.user) {
      setError("Sign In failed");
    } else {
      setError("");
      clearSessionCache("currentUser");
      dispatch(setSuccessMsg("Sign In Successful"));
      setSignedIn(true);
      router.refresh();
      nav(landingRoute(res.user));
    }
    setLoading(false);
  };

  // Fallback for reaching /signin while already authenticated. Suspended once
  // this page has signed someone in and picked their destination.
  useForwardDashboard(!signedIn);

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
