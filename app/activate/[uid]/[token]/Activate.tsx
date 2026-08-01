"use client";

import { MtHeader, AuthPanel } from "@components";
import { useState, useEffect } from "react";
import { useNavigate } from "@/routerCompat";
import { activate } from "@functions/actions";
// email confirmation — runs the activation on mount, then reports the outcome

export default function Activate({ uid, token }: { uid: string; token: string }) {
  const nav = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | success | error

  useEffect(() => {
    activate({ uid, token })
      .then((res) => setStatus(res.error ? "error" : "success"))
      .catch(() => setStatus("error"));
  }, [uid, token]);

  return (
    <>
      <div className="hidden sm:block"><MtHeader /></div>
      <div
        id="bg-component"
        className="bg-secondary h-screen w-full skew-y-6 absolute -top-[50svh] left-0 -z-20"
      />
      <AuthPanel
        bottomLabel="Back to "
        bottomLink="Sign In"
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
