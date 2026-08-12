"use client";

import { MtHeader, Heading, ShortAnswer } from "@components";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import { changePassword, requestEmailChange, loginAction } from "@functions/actions";
import { useNavigate } from "@/routerCompat";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setSuccessMsg } from "@slices";
import { validate, handleFormBlur, handleFormChange } from "@functions/forms";
// edit profile info — change password (immediate) and change email
// (confirm-by-link) for an already-signed-in user

export default function EditProfileInfo({ email }: { email: string }) {
  const nav = useNavigate();
  const router = useRouter();
  const dispatch = useDispatch();

  // ---- change password ----
  const [pwData, setPwData] = useState<Record<string, string>>({});
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const handlePwChange = handleFormChange(setPwData, setPwErrors);
  const handlePwBlur = handleFormBlur(setPwErrors, pwData);

  const handlePasswordSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    const allErrors: Record<string, string> = {};
    ["old_password", "password", "re_password"].forEach((name) => {
      const err = validate(name, pwData[name] || "", pwData);
      if (err) allErrors[name] = err;
    });
    if (Object.keys(allErrors).length > 0) {
      setPwErrors(allErrors);
      return;
    }

    setPwLoading(true);
    setPwError("");
    const res = await changePassword({
      old_password: pwData.old_password,
      new_password: pwData.password,
      confirm_password: pwData.re_password,
    });

    if (res.error) {
      setPwErrors({
        old_password: res.error.old_password || "",
        password: res.error.new_password || "",
        re_password: res.error.confirm_password || "",
      });
      setPwError(res.error.detail || (Object.keys(res.error).length ? "" : "Something went wrong"));
    } else {
      // Bumping token_version (server-side, to revoke other sessions) also
      // invalidates this device's own session token, so silently sign back in
      // with the new password to refresh this device's cookie and stay logged in.
      await loginAction({ email, password: pwData.password });
      setPwData({});
      setPwErrors({});
      dispatch(setSuccessMsg("Password updated successfully."));
      // changePassword's revalidateUserData() already triggered an automatic
      // re-render of the root layout right after it returned, but at that
      // instant the browser still held the pre-change cookie, so the nav
      // briefly showed "Sign In" (getCurrentUser() saw a token_version
      // mismatch). Now that the re-login above has set the fresh cookie,
      // refresh again so the layout picks it up without a manual reload.
      router.refresh();
    }
    setPwLoading(false);
  };

  // ---- change email ----
  const [emailData, setEmailData] = useState<Record<string, string>>({});
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({});
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const handleEmailChange = handleFormChange(setEmailData, setEmailErrors);
  const handleEmailBlur = handleFormBlur(setEmailErrors);

  const handleEmailSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    const err = validate("email", emailData.email || "");
    if (err) {
      setEmailErrors({ email: err });
      return;
    }

    setEmailLoading(true);
    setEmailError("");
    const res = await requestEmailChange({ new_email: emailData.email });

    if (res.error) {
      setEmailErrors({ email: res.error.email || "" });
      setEmailError(res.error.detail || "");
      setEmailLoading(false);
    } else {
      dispatch(setSuccessMsg("Confirmation email sent."));
      nav("/edit-profile-info/awaiting-confirmation");
    }
  };

  return (
    <>
      <div className="hidden sm:block"><MtHeader /></div>
      <div className="flex flex-col items-center gap-6 px-4 pb-10">
        <div className="grow min-w-0 w-full max-w-[36rem] mt-0 sm:mt-10 bg-off-white rounded-xl border border-brown/50">
          <div className="flex flex-col items-center gap-4">
            <Heading className="mt-2 sm:mt-6 !text-3xl !p-2 !animate-none">Change Password</Heading>
            <form className="self-stretch px-4 sm:px-12 pb-10 flex flex-col gap-6" onSubmit={handlePasswordSubmit}>
              {pwError && <div role="alert" className="text-error">{pwError}</div>}
              <ShortAnswer
                type="password"
                name="old_password"
                label="Current Password*"
                onChange={handlePwChange}
                onBlur={handlePwBlur}
                value={pwData.old_password || ""}
                error={pwErrors.old_password}
                required
              />
              <ShortAnswer
                type="password"
                name="password"
                label="New Password*"
                onChange={handlePwChange}
                onBlur={handlePwBlur}
                value={pwData.password || ""}
                error={pwErrors.password}
                required
              />
              <ShortAnswer
                type="password"
                name="re_password"
                label="Confirm New Password*"
                onChange={handlePwChange}
                onBlur={handlePwBlur}
                value={pwData.re_password || ""}
                error={pwErrors.re_password}
                required
              />
              <button type="submit" disabled={pwLoading} className="btn btn-primary self-end">
                {pwLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>

        <div className="grow min-w-0 w-full max-w-[36rem] bg-off-white rounded-xl border border-brown/50">
          <div className="flex flex-col items-center gap-4">
            <Heading className="mt-2 sm:mt-6 !text-3xl !p-2 !animate-none">Change Email</Heading>
            <form className="self-stretch px-4 sm:px-12 pb-10 flex flex-col gap-6" onSubmit={handleEmailSubmit}>
              {emailError && <div role="alert" className="text-error">{emailError}</div>}
              <div className="text-sm text-gray-500">Current email: {email}</div>
              <ShortAnswer
                type="email"
                name="email"
                label="New Email*"
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                value={emailData.email || ""}
                error={emailErrors.email}
                required
              />
              <button type="submit" disabled={emailLoading} className="btn btn-primary self-end">
                {emailLoading ? "Sending..." : "Change Email"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
