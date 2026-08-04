"use client";

import { AuthPanel, MtHeader } from "@components";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "@/routerCompat";
import { confirmEmailChange } from "@functions/actions";

export default function ConfirmEmailChange() {
  const params = useParams();
  const token = params.token as string | undefined;
  const nav = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | success | error

  useEffect(() => {
    confirmEmailChange({ token })
      .then((res) => setStatus(res.error ? "error" : "success"))
      .catch(() => setStatus("error"));
  }, [token]);

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
        title="Confirm Email"
      >
        {status === "loading" && (
          <div className="text-center text-gray-500">Confirming your new email...</div>
        )}
        {status === "success" && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center text-primary font-medium">
              Your email has been updated.
            </div>
            <button type="button" className="btn btn-primary" onClick={() => nav("/dashboard")}>
              Back to Dashboard
            </button>
          </div>
        )}
        {status === "error" && (
          <div className="text-center text-red-500">
            This confirmation link is invalid or has expired.
          </div>
        )}
      </AuthPanel>
    </>
  );
}
