"use client";

import { AuthPanel, MtHeader } from "@components";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "@/routerCompat";
import { activate } from "@functions/actions";

export default function EmailConfirmation() {
  const params = useParams();
  const uid = params.uid as string | undefined;
  const token = params.token as string | undefined;
  const nav = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | success | error

  useEffect(() => {
    activate({ uid, token })
      .then((res) => setStatus(res.error ? "error" : "success"))
      .catch(() => setStatus("error"));
  }, [uid, token]);

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
          <div className="text-center text-gray-500">Confirming your email...</div>
        )}
        {status === "success" && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center text-primary font-medium">
              Your email has been confirmed! You can now sign in.
            </div>
            <button type="button" className="btn btn-primary" onClick={() => nav("/signin")}>
              Sign In
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
