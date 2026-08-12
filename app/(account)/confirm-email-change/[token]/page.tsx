"use client";

import { AuthPanel, MtHeader } from "@components";
import { useState, useEffect } from "react";
import { useParams, Link } from "@/routerCompat";
import { confirmEmailChange } from "@functions/actions";

export default function ConfirmEmailChange() {
  const params = useParams();
  const token = params.token as string | undefined;
  const [status, setStatus] = useState("loading"); // loading | success | error

  useEffect(() => {
    confirmEmailChange({ token })
      .then((res) => setStatus(res.error ? "error" : "success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <>
      <div className="hidden sm:block"><MtHeader/></div>
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
            <Link to="/" className="btn btn-primary">
              Back to Home
            </Link>
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
